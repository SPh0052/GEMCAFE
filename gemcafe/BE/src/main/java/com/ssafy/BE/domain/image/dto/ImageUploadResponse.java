package com.ssafy.BE.domain.image.dto;

import java.time.LocalDateTime;

public record ImageUploadResponse(
        String fileName,
        String originalFileName,
        String fileType,
        long fileSize,
        String mimeType,
        String fileUrl,
        LocalDateTime uploadedAt
) {}
