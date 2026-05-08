package com.ssafy.BE.domain.video.dto;

import jakarta.validation.constraints.NotNull;

public record CreateVideoRequest(
        @NotNull Integer sessionId,
        String userPrompt
) {}
