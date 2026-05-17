package com.ssafy.BE.infra.gemmark.dto;

public record GemmarkEmbedFromPathResponse(
        String storedFileName,
        Long fileSize,
        Double durationSec,
        String watermarkHex,
        Double processingTime
) {}
