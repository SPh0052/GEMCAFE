package com.ssafy.BE.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiVideoResponse(
        @JsonProperty("video_url") String videoUrl,
        @JsonProperty("save_dir") String saveDir,
        @JsonProperty("start_url") String startUrl,
        @JsonProperty("end_url") String endUrl,
        @JsonProperty("video_prompt") String videoPrompt
) {}
