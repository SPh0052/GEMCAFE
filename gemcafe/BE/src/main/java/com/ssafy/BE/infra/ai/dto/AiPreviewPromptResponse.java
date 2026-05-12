package com.ssafy.BE.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiPreviewPromptResponse(
        @JsonProperty("korean_preview") String koreanPreview
) {}
