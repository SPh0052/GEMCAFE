package com.ssafy.BE.infra.oauth.google.dto;

/**
 * Google ID Token 검증 후 추출한 사용자 프로필.
 *
 * sub: 구글 계정 고유 식별자. User.providerUserId 에 저장.
 * emailVerified: 구글에서 이메일 인증을 마친 계정인지 여부. false 면 우리 시스템에서도 신뢰하지 않음.
 */
public record GoogleProfile(
        String sub,
        String email,
        boolean emailVerified,
        String name,
        String picture
) {}
