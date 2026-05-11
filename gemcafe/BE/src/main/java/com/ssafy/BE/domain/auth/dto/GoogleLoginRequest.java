package com.ssafy.BE.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 구글 로그인 요청 — FE 가 GIS 의 id.initialize 콜백에서 받은 credential(ID Token) 을 그대로 전달한다.
 */
public record GoogleLoginRequest(
        @NotBlank(message = "idToken 은 필수입니다")
        String idToken
) {}
