package com.ssafy.BE.domain.cake.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 키프레임 생성 요청.
 *
 * AI 서비스가 단일 진실 소스(SSOT)이므로 simulation/background 키를 string code 로 직접 전달.
 * (예: simulationCode="smash", backgroundCode="white_marble")
 *
 * FE 는 AI /catalog 응답의 키를 그대로 사용.
 * backgroundCode 는 선택값 — null/blank 시 배경 교체 없이 원본 이미지 그대로 사용.
 */
public record KeyframeGenerateRequest(
        @NotBlank String simulationCode,
        String backgroundCode,
        String focus,
        String hint
) {}
