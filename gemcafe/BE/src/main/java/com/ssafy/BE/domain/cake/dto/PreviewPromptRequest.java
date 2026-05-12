package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 자동 프롬프트 생성 요청.
 *
 * AI 서비스가 SSOT 이므로 simulation/background 키를 string code 로 직접 전달.
 * (BE 는 DB lookup 없이 그대로 패스)
 */
public record PreviewPromptRequest(
        @NotBlank String simulationCode,
        @NotBlank String backgroundCode,
        @NotBlank String focus,
        String hint
) {}
