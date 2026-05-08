package com.ssafy.BE.domain.video.dto;

public record CreateVideoResponse(
        Integer videoId,
        Integer sessionId,
        String status,
        Integer gemUsed
) {}
