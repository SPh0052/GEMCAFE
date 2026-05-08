package com.ssafy.BE.domain.video.dto;

public record VideoShareResponse(
        Integer videoId,
        String videoUrl,
        String thumbnailUrl,
        String title
) {}
