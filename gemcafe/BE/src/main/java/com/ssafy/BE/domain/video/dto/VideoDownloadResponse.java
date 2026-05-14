package com.ssafy.BE.domain.video.dto;

public record VideoDownloadResponse(
        Integer videoId,
        String fileUrl,
        String fileName,
        Integer fileSize
) {}
