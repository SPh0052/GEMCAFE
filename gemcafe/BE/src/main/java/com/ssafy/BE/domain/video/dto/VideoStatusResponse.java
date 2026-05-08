package com.ssafy.BE.domain.video.dto;

import java.time.LocalDateTime;

public record VideoStatusResponse(
        Integer videoId,
        String status,
        String storedFileName,
        String thumbnailFileName,
        Integer fileSize,
        LocalDateTime createdAt
) {}
