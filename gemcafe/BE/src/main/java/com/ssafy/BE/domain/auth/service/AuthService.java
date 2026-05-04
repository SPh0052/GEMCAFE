package com.ssafy.BE.domain.auth.service;

import com.ssafy.BE.domain.auth.dto.LoginRequest;
import com.ssafy.BE.domain.auth.dto.SignupRequest;
import com.ssafy.BE.domain.auth.dto.SignupResponse;
import com.ssafy.BE.domain.auth.dto.TokenPair;
import com.ssafy.BE.domain.user.entity.Provider;
import com.ssafy.BE.domain.user.entity.User;
import com.ssafy.BE.domain.user.repository.UserRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.security.jwt.JwtTokenProvider;
import com.ssafy.BE.security.jwt.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int SIGNUP_BONUS_GEM = 20;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistService tokenBlacklistService;

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
}
