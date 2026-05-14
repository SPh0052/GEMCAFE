package com.ssafy.BE.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * AI /video 호출용 요청 DTO.
 *
 * 두 가지 모드:
 *  - video_prompt_kr (한국어) 지정 시 AI가 LLM 번역 + 잠금 라이브러리 결합 → simulation 필수
 *  - video_prompt (영어) 지정 시 그대로 사용
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiVideoRequest(
        @JsonProperty("start_url") String startUrl,
        @JsonProperty("end_url") String endUrl,
        @JsonProperty("video_prompt") String videoPrompt,
        @JsonProperty("video_prompt_kr") String videoPromptKr,
        @JsonProperty("simulation") String simulation,
        @JsonProperty("background") String background,
        @JsonProperty("model_id") String modelId,
        @JsonProperty("duration") String duration,
        @JsonProperty("resolution") String resolution,
        @JsonProperty("generate_audio") boolean generateAudio
) {}
