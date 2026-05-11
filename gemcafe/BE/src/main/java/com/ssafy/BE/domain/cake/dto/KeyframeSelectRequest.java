package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 키프레임 선택 요청.
 *
 * videoPromptKr: 사용자가 수정한 최종 영상 한국어 묘사.
 *                선택 시점에 세션에 저장되어 /videos 호출 시 AI /video 에 전달됨.
 *                null/blank 이면 AI 측 기본 영문 video_prompt 사용 (fallback).
 */
public record KeyframeSelectRequest(
        @NotNull Integer keyframeId,
        String videoPromptKr
) {}
