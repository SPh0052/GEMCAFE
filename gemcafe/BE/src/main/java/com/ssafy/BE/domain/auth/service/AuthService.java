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
}
