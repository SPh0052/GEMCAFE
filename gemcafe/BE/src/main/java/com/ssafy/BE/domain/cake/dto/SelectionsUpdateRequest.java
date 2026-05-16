package com.ssafy.BE.domain.cake.dto;

public record SelectionsUpdateRequest(
        String simulationCode,
        String backgroundCode,
        String focus,
        String hint
) {}
