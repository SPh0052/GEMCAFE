package com.ssafy.BE.infra.uploadpost;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app-uploadpost")
public record UploadPostProperties(
        String baseUrl,
        String apiKey,
        String defaultUser,
        String watermarkedMount,
        Integer connectTimeoutMs,
        Integer readTimeoutMs
) {}
