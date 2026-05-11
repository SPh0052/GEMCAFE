package com.ssafy.BE.domain.auth.controller;

import com.ssafy.BE.domain.auth.dto.CompleteProfileRequest;
import com.ssafy.BE.domain.auth.dto.GoogleLoginRequest;
import com.ssafy.BE.domain.auth.dto.GoogleLoginResponse;
import com.ssafy.BE.domain.auth.dto.GoogleLoginResult;
import com.ssafy.BE.domain.auth.dto.LoginRequest;
import com.ssafy.BE.domain.auth.dto.LoginResponse;
import com.ssafy.BE.domain.auth.dto.SignupRequest;
import com.ssafy.BE.domain.auth.dto.SignupResponse;
import com.ssafy.BE.domain.auth.dto.TokenPair;
import com.ssafy.BE.domain.auth.service.AuthService;
import com.ssafy.BE.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@Tag(name = "Auth", description = "회원가입 / 로그인 / 로그아웃 / 소셜 로그인")
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
        addRefreshCookie(response, tokens.refreshToken());

        LoginResponse body = new LoginResponse(
                tokens.accessToken(),
                "Bearer",
                tokens.accessExpiresIn()
        );
        return ApiResponse.ok("로그인 성공", body);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletResponse response,
            @CookieValue(name = "${app.cookie.refresh-name:refreshToken}", required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        clearRefreshCookie(response);
        return ApiResponse.ok("로그아웃 성공");
    }

    @Operation(summary = "구글 ID Token 로그인 (Google Identity Services 의 credential 을 그대로 전달)")
    @PostMapping("/google")
    public ApiResponse<GoogleLoginResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletResponse response
    ) {
        GoogleLoginResult result = authService.loginWithGoogle(request.idToken());
        addRefreshCookie(response, result.tokens().refreshToken());

        GoogleLoginResponse body = new GoogleLoginResponse(
                result.tokens().accessToken(),
                "Bearer",
                result.tokens().accessExpiresIn(),
                result.isNewUser(),
                result.profile().email(),
                result.profile().name(),
                result.profile().picture()
        );
        return ApiResponse.ok(result.isNewUser() ? "구글 회원가입 성공" : "구글 로그인 성공", body);
    }

    @Operation(summary = "소셜 로그인 신규 가입자 추가 정보(전화번호) 입력")
    @PostMapping("/google/complete-profile")
    public ApiResponse<Void> completeProfile(
            @AuthenticationPrincipal Integer userId,
            @Valid @RequestBody CompleteProfileRequest request
    ) {
        authService.completeProfile(userId, request);
        return ApiResponse.ok("추가 정보 입력 완료");
    }

    // ---------- 공통 쿠키 헬퍼 ----------

    private void addRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(refreshCookiePath)
                .maxAge(Duration.ofDays(refreshExpireDays))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(refreshCookiePath)
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
