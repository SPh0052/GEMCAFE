package com.ssafy.BE.domain.video.dto;

import java.time.LocalDateTime;

public record VideoListItemResponse(
        Integer videoId,
        String title,
        String thumbnailUrl,
        LocalDateTime createdAt
) {}
