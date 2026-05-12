package com.ssafy.BE.infra.gemmark;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app-gemmark")
public record GemmarkProperties(
        String baseUrl,
        Integer connectTimeoutMs,
        Integer readTimeoutMs
) {}
