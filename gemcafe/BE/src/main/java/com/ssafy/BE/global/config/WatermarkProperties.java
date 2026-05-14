package com.ssafy.BE.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app-watermark")
public record WatermarkProperties(
        String subdir,
        Integer alpha,
        String redisChannelPrefix,
        String redisJobKeyPrefix,
        Long redisJobTtlMinutes,
        Long sseTimeoutMs,
        String sourceMountPrefix
) {
    public String channelFor(String jobId) {
        return redisChannelPrefix + ":" + jobId;
    }

    public String jobKeyFor(String jobId) {
        return redisJobKeyPrefix + ":" + jobId;
    }
}
