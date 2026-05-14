package com.ssafy.BE.security.jwt;

import com.ssafy.BE.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 인증되지 않은(또는 토큰 만료/위변조) 요청이 보호된 endpoint 에 접근할 때 호출.
 * Spring Security 의 기본 401/403 분기를 잡아 일관된 JSON 응답을 만든다.
 *
 * 응답:
 *  HTTP 401 + body = {"status":401,"errorCode":"AUTH-003","message":"유효하지 않은 토큰입니다"}
 *
 * FE 의 axios interceptor 가 이 401 을 받아 refresh 토큰으로 새 access 발급을 시도한다.
 */
@Slf4j
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        log.debug("[JWT-401] path={} reason={}", request.getRequestURI(), authException.getMessage());

        ErrorCode code = ErrorCode.AUTH_INVALID_TOKEN;
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"status\":401,\"errorCode\":\"" + code.getCode()
                        + "\",\"message\":\"" + code.getMessage() + "\"}"
        );
    }
}
