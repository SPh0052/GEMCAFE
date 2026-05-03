package com.ssafy.BE.domain.auth.controller;

import com.ssafy.BE.domain.auth.dto.LoginRequest;
import com.ssafy.BE.domain.auth.dto.LoginResponse;
import com.ssafy.BE.domain.auth.dto.SignupRequest;
import com.ssafy.BE.domain.auth.dto.SignupResponse;
import com.ssafy.BE.domain.auth.dto.TokenPair;
import com.ssafy.BE.domain.auth.service.AuthService;
import com.ssafy.BE.global.common.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.cookie.refresh-name:refreshToken}")
    private String refreshCookieName;

    @Value("${app.cookie.refresh-path:/api/v1/auth}")
    private String refreshCookiePath;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Strict}")
    private String cookieSameSite;

    @Value("${jwt.refresh-expire-days:7}")
    private long refreshExpireDays;

    @PostMapping("/signup")
    public ApiResponse<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse data = authService.signup(request);
        return ApiResponse.ok("회원가입 성공", data);
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        TokenPair tokens = authService.login(request);

        ResponseCookie refreshCookie = ResponseCookie.from(refreshCookieName, tokens.refreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(refreshCookiePath)
                .maxAge(Duration.ofDays(refreshExpireDays))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        LoginResponse body = new LoginResponse(
                tokens.accessToken(),
                "Bearer",
                tokens.accessExpiresIn()
        );
        return ApiResponse.ok("로그인 성공", body);
    }
}
