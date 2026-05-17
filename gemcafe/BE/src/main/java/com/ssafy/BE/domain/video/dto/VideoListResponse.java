package com.ssafy.BE.domain.video.dto;

import java.util.List;

public record VideoListResponse(
        List<VideoListItemResponse> items,
        Integer nextCursor,
        boolean hasNext
) {}
