package com.ssafy.BE.domain.video.dto;

import java.util.List;

/**
 * SNS 자동 게시 응답.
 *
 * @param results 플랫폼별 게시 결과 (성공/실패 + jobId).
 */
public record SocialUploadResponse(
        List<PlatformResult> results
) {
    public record PlatformResult(
            String platform,
            boolean success,
            String jobId,
            String status,
            String reason
    ) {}
}
