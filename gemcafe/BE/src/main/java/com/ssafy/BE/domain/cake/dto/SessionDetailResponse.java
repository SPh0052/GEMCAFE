package com.ssafy.BE.domain.cake.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * video_session 의 모든 컬럼 + 해당 세션의 키프레임 후보 전체.
 *
 * null 컬럼도 응답에 그대로 null 로 유지 (필드 생략 X).
 */
public record SessionDetailResponse(
        Integer sessionId,
        String status,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        long expiresInSec,
        Integer keyframeAttempts,
        Integer videoId,
        InputImage inputImage,
        String crossSectionFileName,
        Map<String, Object> analysis,
        Selections selections,
        String videoPromptKr,
        Integer selectedKeyframeId,
        List<KeyframeInfo> keyframes
) {
    public record InputImage(
            String fileName,
            String url
    ) {}

    public record Selections(
            String simulationCode,
            String backgroundCode,
            String focus,
            String hint
    ) {}

    public record KeyframeInfo(
            Integer keyframeId,
            Integer attemptNumber,
            String keyframeUrl,
            String baseUrl,
            String frameStrategy,
            String videoPrompt,
            Integer seed,
            Map<String, Object> metadata,
            boolean isSelected,
            LocalDateTime createdAt
    ) {}
}
