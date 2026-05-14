package com.ssafy.BE.domain.auth.dto;

/**
 * 구글 로그인 응답.
 *
 * - accessToken/tokenType/expiresIn: 우리 서비스의 자체 JWT (기존 LoginResponse 와 동일 포맷)
 * - isNewUser: 가입 직후 (= 추가 정보 입력이 안 된) 사용자 여부.
 *              true 면 FE 는 /signup/phone 으로 보내서 전화번호를 받아야 함.
 * - email/name/picture: FE 가 별도 /me 호출 없이 바로 표시할 수 있도록 동봉.
 */
public record GoogleLoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        boolean isNewUser,
        String email,
        String name,
        String picture
) {}
