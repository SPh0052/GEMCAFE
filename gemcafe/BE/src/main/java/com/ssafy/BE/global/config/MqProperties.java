package com.ssafy.BE.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app-mq")
public record MqProperties(
        String exchange,
        String watermarkExchange,
        Queue queue,
        RoutingKey routingKey
) {
    public record Queue(String videoGenerate, String watermarkRequest) {}
    public record RoutingKey(String videoGenerate, String watermarkRequest) {}
}
