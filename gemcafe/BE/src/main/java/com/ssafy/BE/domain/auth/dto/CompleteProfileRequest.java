package com.ssafy.BE.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 소셜 로그인 사용자가 가입 후 추가 정보(전화번호) 입력 시 사용.
 */
public record CompleteProfileRequest(
        @NotBlank(message = "전화번호는 필수입니다")
        @Pattern(
                regexp = "^\\d{10,11}$",
                message = "휴대폰 번호는 숫자 10~11자여야 합니다"
        )
        String phone
) {}
