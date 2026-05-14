package com.ssafy.BE.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * AI /preview-prompts 호출용 요청 DTO.
 * AI 서비스가 사용자 선택값을 받아 자연스러운 한국어 영상 묘사를 생성.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiPreviewPromptRequest(
        @JsonProperty("simulation") String simulation,
        @JsonProperty("focus") String focus,
        @JsonProperty("background") String background,
        @JsonProperty("hint") String hint,
        @JsonProperty("dessert_info") String dessertInfo,
        @JsonProperty("cake_elements") List<String> cakeElements,
        @JsonProperty("analysis") Map<String, Object> analysis
) {}
