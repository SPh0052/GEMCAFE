package com.ssafy.BE.domain.video.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * SNS 자동 게시 요청.
 *
 * @param platforms       업로드할 플랫폼 목록 (youtube, instagram)
 * @param title           제목 (YouTube 동영상 제목)
 * @param description     YouTube 설명 (선택)
 * @param tags            YouTube 태그, 쉼표 구분 (선택)
 * @param instagramCaption Instagram 캡션 (생략 시 title 사용)
 * @param scheduledDate   예약 시각 ISO-8601 (선택). 미설정 시 즉시 게시
 * @param timezone        예약 타임존 (IANA, 예: "Asia/Seoul"). scheduledDate 와 함께 사용
 */
public record SocialUploadRequest(
        @NotEmpty(message = "업로드 플랫폼을 1개 이상 선택해주세요")
        List<String> platforms,

        @NotEmpty(message = "제목은 필수입니다")
        @Size(max = 100, message = "제목은 100자 이하여야 합니다")
        String title,

        @Size(max = 5000, message = "설명은 5000자 이하여야 합니다")
        String description,

        @Size(max = 500, message = "태그는 500자 이하여야 합니다")
        String tags,

        @Size(max = 2200, message = "인스타그램 캡션은 2200자 이하여야 합니다")
        String instagramCaption,

        String scheduledDate,
        String timezone
) {}
