package com.ssafy.BE.domain.cake.dto;

public record KeyframeSelectResponse(
        Integer sessionId,
        Integer selectedKeyframeId,
        String status
) {}
