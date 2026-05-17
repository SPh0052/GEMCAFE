package com.ssafy.BE.domain.video.dto;

import java.time.LocalDateTime;

public record UpdateVideoResponse(
        Integer videoId,
        String title,
        String thumbnailUrl,
        String videoUrl,
        LocalDateTime updatedAt
) {}
