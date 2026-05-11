package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 자동 프롬프트 생성 요청. 사용자 선택값을 받아 AI가 자연스러운 한국어 영상 묘사를 만들어준다.
 *
 * - simulationId/backgroundId: BE의 DB id. 서버에서 code로 변환해서 AI에 전달
 * - focus: AI 측 키 (sponge/strawberry/whipped_cream)
 * - hint: 선택. 사용자 자유 텍스트
 */
public record PreviewPromptRequest(
        @NotNull Integer simulationId,
        @NotNull Integer backgroundId,
        @NotNull String focus,
        String hint
) {}
