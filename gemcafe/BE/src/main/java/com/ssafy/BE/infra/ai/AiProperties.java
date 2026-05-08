package com.ssafy.BE.infra.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app-ai")
public record AiProperties(
        String baseUrl,
        int connectTimeoutMs,
        int readTimeoutMs
) {}
