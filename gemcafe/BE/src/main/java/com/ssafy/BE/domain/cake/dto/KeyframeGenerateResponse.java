package com.ssafy.BE.domain.cake.dto;

public record KeyframeGenerateResponse(
        Integer keyframeId,
        Integer attemptNumber,
        String keyframeUrl
) {}
