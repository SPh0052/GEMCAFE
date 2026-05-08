package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotNull;

public record KeyframeSelectRequest(
        @NotNull Integer keyframeId
) {}
