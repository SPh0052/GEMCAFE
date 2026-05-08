package com.ssafy.BE.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiVideoRequest(
        @JsonProperty("start_url") String startUrl,
        @JsonProperty("end_url") String endUrl,
        @JsonProperty("video_prompt") String videoPrompt,
        @JsonProperty("duration") String duration,
        @JsonProperty("resolution") String resolution,
        @JsonProperty("generate_audio") boolean generateAudio
) {}
