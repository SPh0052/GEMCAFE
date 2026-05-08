package com.ssafy.BE.domain.video.dto;

import java.io.Serializable;

public record VideoGenerationMessage(
        Integer videoId,
        Integer userId,
        String startUrl,
        String endUrl,
        String videoPrompt,
        String duration,
        String resolution,
        Boolean generateAudio
) implements Serializable {

    public static VideoGenerationMessage of(
            Integer videoId,
            Integer userId,
            String startUrl,
            String endUrl,
            String videoPrompt
    ) {
        return new VideoGenerationMessage(
                videoId,
                userId,
                startUrl,
                endUrl,
                videoPrompt,
                "6s",
                "720p",
                false
        );
    }
}
