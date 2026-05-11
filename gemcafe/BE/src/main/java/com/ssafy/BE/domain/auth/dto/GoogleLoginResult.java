package com.ssafy.BE.domain.auth.dto;

import com.ssafy.BE.infra.oauth.google.dto.GoogleProfile;

/**
 * AuthService 내부 결과 객체. 컨트롤러가 토큰 + 신규여부 + 프로필을 한 번에 받도록 묶음.
 * (외부 응답 DTO 인 GoogleLoginResponse 로 컨트롤러에서 매핑.)
 */
public record GoogleLoginResult(
        TokenPair tokens,
        boolean isNewUser,
        GoogleProfile profile
) {}
