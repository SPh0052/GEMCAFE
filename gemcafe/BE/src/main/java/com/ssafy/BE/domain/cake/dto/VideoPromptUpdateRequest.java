package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotBlank;

public record VideoPromptUpdateRequest(
        @NotBlank String videoPromptKr,
        String hint
) {}
