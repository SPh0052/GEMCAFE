package com.ssafy.BE.domain.photo.dto;

import java.time.LocalDateTime;

public record PhotoUploadResponse(
        String fileName,
        String originalFileName,
        String fileType,
        long fileSize,
        String mimeType,
        String fileUrl,
        LocalDateTime uploadedAt
) {}
