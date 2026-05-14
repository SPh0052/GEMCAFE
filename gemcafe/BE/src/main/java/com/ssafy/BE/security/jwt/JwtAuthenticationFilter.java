package com.ssafy.BE.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * 모든 요청에서 Authorization: Bearer {accessToken} 검증.
 *
 * - 토큰 없거나 부적합 → SecurityContext 설정 안 함 (이후 권한 규칙이 401/403 결정)
 * - 토큰 유효 + access 타입 → SecurityContext에 userId 등록
 *
 * 블랙리스트 검사는 access 토큰엔 적용 X (짧은 TTL 1시간이라 자연 만료에 맡김).
 * 블랙리스트는 refresh 토큰을 차단하기 위한 용도 (/refresh 엔드포인트에서 검사 예정).
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String token = resolveToken(request);
        if (token != null) {
            authenticate(token);
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(String token) {
        try {
            Claims claims = jwtTokenProvider.parse(token);

            String type = claims.get("type", String.class);
            if (!JwtTokenProvider.TYPE_ACCESS.equals(type)) {
                // refresh token 으로는 일반 API 인증 X. context 안 채움 → EntryPoint 가 401
                SecurityContextHolder.clearContext();
                return;
            }

            Integer userId = Integer.valueOf(claims.getSubject());
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of());
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (JwtException | NumberFormatException ignored) {
            // 토큰 만료/위변조/형식 오류 → context clear → 보호 endpoint 접근 시 EntryPoint 가 401
            SecurityContextHolder.clearContext();
        }
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return null;
        }
        return header.substring(BEARER_PREFIX.length()).trim();
    }
}
