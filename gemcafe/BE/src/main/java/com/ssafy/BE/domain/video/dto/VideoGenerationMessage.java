package com.ssafy.BE.domain.video.dto;

import java.io.Serializable;

public record VideoGenerationMessage(
        Integer videoId,
        Integer userId,
        String startUrl,
        String endUrl,
        String videoPrompt,
        String videoPromptKr,
        String simulationCode,
        String backgroundCode,
        String duration,
        String resolution,
        Boolean generateAudio
) implements Serializable {

    /**
     * 한국어 우선 흐름용 팩토리.
     * videoPromptKr 가 있으면 AI /video 가 LLM 번역 + 잠금 라이브러리 결합 모드로 동작.
     * simulationCode/backgroundCode 는 AI 측 키 (예: smash, white_marble).
     */
    public static VideoGenerationMessage of(
            Integer videoId,
            Integer userId,
            String startUrl,
            String endUrl,
            String videoPrompt,
            String videoPromptKr,
            String simulationCode,
            String backgroundCode
    ) {
        return new VideoGenerationMessage(
                videoId,
                userId,
                startUrl,
                endUrl,
                videoPrompt,
                videoPromptKr,
                simulationCode,
                backgroundCode,
                "6s",
                "720p",
                false
        );
    }
}
