package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotNull;

public record KeyframeGenerateRequest(
        @NotNull Integer simulationId,
        @NotNull Integer backgroundId,
        String focus,
        String hint
) {}
