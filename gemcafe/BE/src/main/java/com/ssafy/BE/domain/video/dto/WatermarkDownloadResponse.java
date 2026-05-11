package com.ssafy.BE.domain.video.dto;

public record WatermarkDownloadResponse(
        String jobId,
        String sseUrl
) {
}
