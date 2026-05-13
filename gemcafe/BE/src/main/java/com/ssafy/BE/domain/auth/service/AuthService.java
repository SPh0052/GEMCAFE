package com.ssafy.BE.domain.auth.service;

import com.ssafy.BE.domain.auth.dto.CompleteProfileRequest;
import com.ssafy.BE.domain.auth.dto.GoogleLoginResult;
import com.ssafy.BE.domain.auth.dto.LoginRequest;
import com.ssafy.BE.domain.auth.dto.SignupRequest;
import com.ssafy.BE.domain.auth.dto.SignupResponse;
import com.ssafy.BE.domain.auth.dto.TokenPair;
import com.ssafy.BE.domain.user.entity.Provider;
import com.ssafy.BE.domain.user.entity.User;
import com.ssafy.BE.domain.user.repository.UserRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.oauth.google.GoogleIdTokenService;
import com.ssafy.BE.infra.oauth.google.GoogleOAuthProperties;
import com.ssafy.BE.infra.oauth.google.dto.GoogleProfile;
import com.ssafy.BE.security.jwt.JwtTokenProvider;
import com.ssafy.BE.security.jwt.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int SIGNUP_BONUS_GEM = 20;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;
    private final GoogleIdTokenService googleIdTokenService;
    private final GoogleOAuthProperties googleProps;

    @Transactional
    public SignupResponse signup(SignupRequest req) {
        if (userRepository.existsByEmailAndDeletedAtIsNull(req.email())) {
            throw new BusinessException(ErrorCode.USER_EMAIL_DUPLICATED);
        }

        String phone = (req.phone() == null || req.phone().isBlank()) ? null : req.phone();

        User user = User.builder()
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .name(req.name())
                .phone(phone)
                .provider(Provider.LOCAL)
                .gem(SIGNUP_BONUS_GEM)
                .build();

        User saved = userRepository.save(user);
        return new SignupResponse(saved.getId());
    }

    @Transactional(readOnly = true)
    public TokenPair login(LoginRequest req) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(req.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS));

        if (user.getPassword() == null || !passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        return new TokenPair(accessToken, refreshToken, jwtTokenProvider.accessExpireSeconds());
    }

    /**
     * Refresh 토큰으로 새 토큰 페어 발급.
     *
     *  1. refresh 토큰 파싱/서명 검증
     *  2. type == "refresh" 인지 확인 (access 토큰으로 갱신 시도 차단)
     *  3. jti 가 블랙리스트(로그아웃 처리됨)에 있는지 확인
     *  4. 옛 refresh 의 jti 를 블랙리스트에 등록 (rotation — 1회 사용 후 폐기)
     *  5. 새 access + refresh 페어 발급해 반환
     */
    public TokenPair refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        Claims claims;
        try {
            claims = jwtTokenProvider.parse(refreshToken);
        } catch (JwtException e) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        String type = claims.get("type", String.class);
        if (!"refresh".equals(type)) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        String jti = claims.getId();
        if (tokenBlacklistService.isBlacklisted(jti)) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        Integer userId;
        try {
            userId = Integer.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        // rotation: 옛 refresh 의 남은 TTL 동안 블랙리스트 → 재사용 차단
        long ttl = (claims.getExpiration().getTime() - System.currentTimeMillis()) / 1000;
        if (ttl > 0) {
            tokenBlacklistService.blacklist(jti, ttl);
        }

        String newAccess = jwtTokenProvider.createAccessToken(userId);
        String newRefresh = jwtTokenProvider.createRefreshToken(userId);
        log.info("[TOKEN-REFRESH] userId={} oldJti={}", userId, jti);
        return new TokenPair(newAccess, newRefresh, jwtTokenProvider.accessExpireSeconds());
    }

    /**
     * 로그아웃 — refresh 토큰의 jti를 Redis 블랙리스트에 등록.
     * access는 짧은 TTL(1시간)로 자연 만료 — 추후 /refresh 호출 차단으로 사실상 무효화.
     */
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            Claims claims = jwtTokenProvider.parse(refreshToken);
            long ttl = (claims.getExpiration().getTime() - System.currentTimeMillis()) / 1000;
            tokenBlacklistService.blacklist(claims.getId(), ttl);
        } catch (JwtException ignored) {
            // 이미 만료/위변조된 토큰은 블랙리스트할 필요 없음
        }
    }

    /**
     * 구글 ID Token Flow 로그인.
     *
     *  1. ID Token 검증 (서명 / aud / iss / exp / email_verified)
     *  2. (provider, sub) 으로 기존 사용자 조회
     *      - 있으면 그대로 로그인
     *      - 없으면 신규 가입. 단 같은 email 의 LOCAL 계정이 이미 있으면 충돌 에러
     *  3. 우리 서비스 자체 JWT 발급
     *  4. isNewUser = (전화번호 미입력) — FE 가 추가 정보 입력 단계로 보낼지 판단
     */
    @Transactional
    public GoogleLoginResult loginWithGoogle(String idToken) {
        GoogleProfile profile = googleIdTokenService.verify(idToken);

        User user = userRepository
                .findByProviderAndProviderUserIdAndDeletedAtIsNull(Provider.GOOGLE, profile.sub())
                .orElseGet(() -> registerGoogleUser(profile));

        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        TokenPair tokens = new TokenPair(accessToken, refreshToken, jwtTokenProvider.accessExpireSeconds());

        boolean isNewUser = !user.hasPhone();
        log.info("[GOOGLE-LOGIN] userId={} email={} newUser={}", user.getId(), user.getEmail(), isNewUser);
        return new GoogleLoginResult(tokens, isNewUser, profile);
    }

    private User registerGoogleUser(GoogleProfile profile) {
        // 같은 email 의 일반 가입자가 이미 있으면 자동 병합하지 않고 명시적 에러.
        // (계정 탈취 방지 — 사용자가 LOCAL 로 로그인한 뒤 별도 연동 플로우를 거치도록 유도)
        userRepository.findByEmailAndDeletedAtIsNull(profile.email()).ifPresent(existing -> {
            if (existing.getProvider() != Provider.GOOGLE) {
                throw new BusinessException(ErrorCode.AUTH_EMAIL_PROVIDER_CONFLICT);
            }
        });

        Integer bonus = googleProps.signupBonusGem() != null ? googleProps.signupBonusGem() : SIGNUP_BONUS_GEM;
        User user = User.builder()
                .email(profile.email())
                .password(null)               // 소셜 가입자는 비밀번호 없음
                .name(safeName(profile))
                .phone(null)                  // 신규는 전화번호 없음 → completeProfile 단계에서 채움
                .provider(Provider.GOOGLE)
                .providerUserId(profile.sub())
                .emailVerified(profile.emailVerified())
                .gem(bonus)
                .build();
        User saved = userRepository.save(user);
        log.info("[GOOGLE-SIGNUP] userId={} email={} sub={}", saved.getId(), saved.getEmail(), profile.sub());
        return saved;
    }

    private String safeName(GoogleProfile profile) {
        String src = (profile.name() != null && !profile.name().isBlank())
                ? profile.name()
                : profile.email().split("@")[0];
        return src.length() > 30 ? src.substring(0, 30) : src;
    }

    /**
     * 소셜 로그인 신규 가입자가 전화번호를 추가 입력하는 단계.
     */
    @Transactional
    public void completeProfile(Integer userId, CompleteProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.hasPhone()) {
            throw new BusinessException(ErrorCode.AUTH_PROFILE_ALREADY_COMPLETED);
        }
        user.completePhone(req.phone());
        log.info("[PROFILE-COMPLETE] userId={} phone added", userId);
    }
}
