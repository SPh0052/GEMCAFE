package com.ssafy.BE.domain.cake.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 진행 중인 video_session 목록 응답 (가벼움).
 *
 * 카드 리스트 표시 용도. 클릭 시 SessionDetailResponse 로 전체 정보 조회.
 */
public record SessionListResponse(
        List<Item> items,
        int total
) {
    public record Item(
            Integer sessionId,
            String status,
            LocalDateTime createdAt,
            InputImage inputImage
    ) {}

    public record InputImage(
            String fileName,
            String url
    ) {}
}
