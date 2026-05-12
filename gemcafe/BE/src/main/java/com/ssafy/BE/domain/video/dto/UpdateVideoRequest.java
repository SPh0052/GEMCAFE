package com.ssafy.BE.domain.video.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateVideoRequest(
        @NotBlank(message = "제목은 필수입니다")
        @Size(max = 50, message = "제목은 50자 이하여야 합니다")
        String title
) {}
