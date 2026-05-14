package com.ssafy.BE.domain.cake.dto;

/**
 * 자동 프롬프트 응답.
 *
 * videoPromptKr: 화면에 표시되고 사용자가 수정 가능한 한국어 영상 묘사.
 *                수정 후 /select-keyframe 에 그대로 전달되어 세션에 저장됨.
 */
public record PreviewPromptResponse(
        String videoPromptKr
) {}
