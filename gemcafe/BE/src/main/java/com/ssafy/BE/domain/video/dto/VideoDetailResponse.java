package com.ssafy.BE.domain.video.dto;

import java.time.LocalDateTime;

public record VideoDetailResponse(
        Integer videoId,
        String title,
        String thumbnailUrl,
        String videoUrl,
        LocalDateTime createdAt
) {}
