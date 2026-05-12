package com.ssafy.BE.infra.gemmark.dto;

public record GemmarkEmbedFromPathRequest(
        String sourceFilePath,
        String downloaderUserId,
        Integer alpha
) {}
