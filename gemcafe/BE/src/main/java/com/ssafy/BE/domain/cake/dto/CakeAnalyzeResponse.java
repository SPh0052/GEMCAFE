package com.ssafy.BE.domain.cake.dto;

import java.util.Map;

public record CakeAnalyzeResponse(
        Integer sessionId,
        Map<String, Object> analysis
) {}
