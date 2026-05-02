package com.ssafy.BE.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "이메일은 필수입니다")
        @Email(message = "이메일 형식이 올바르지 않습니다")
        @Size(max = 255, message = "이메일은 255자 이하여야 합니다")
        String email,

        @NotBlank(message = "비밀번호는 필수입니다")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$",
                message = "비밀번호는 영문/숫자 포함 8자 이상이어야 합니다"
        )
        String password,

        @NotBlank(message = "이름은 필수입니다")
        @Size(max = 30, message = "이름은 30자 이하여야 합니다")
        String name,

        @Pattern(
                regexp = "^$|^\\d{10,11}$",
                message = "휴대폰 번호는 숫자 10~11자여야 합니다"
        )
        String phone
) {}
