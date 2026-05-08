package com.ssafy.BE.infra.ai;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.ai.dto.AiVideoRequest;
import com.ssafy.BE.infra.ai.dto.AiVideoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

@Slf4j
@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiVideoClient {

    private final RestClient restClient;

    public AiVideoClient(AiProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("[AiVideoClient] baseUrl={}, connectTimeout={}ms, readTimeout={}ms",
                props.baseUrl(), props.connectTimeoutMs(), props.readTimeoutMs());
    }

    public AiVideoResponse generate(AiVideoRequest request) {
        log.info("[AI-VIDEO] request start startUrl={} endUrl={}", request.startUrl(), request.endUrl());
        try {
            AiVideoResponse response = restClient.post()
                    .uri("/video")
                    .body(request)
                    .retrieve()
                    .body(AiVideoResponse.class);

            if (response == null || response.videoUrl() == null) {
                throw new BusinessException(ErrorCode.AI_VIDEO_GENERATION_FAILED);
            }
            log.info("[AI-VIDEO] success videoUrl={}", response.videoUrl());
            return response;
        } catch (ResourceAccessException e) {
            log.error("[AI-VIDEO] connection/timeout: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_VIDEO_UNREACHABLE);
        } catch (RestClientResponseException e) {
            log.error("[AI-VIDEO] AI server returned error status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_VIDEO_GENERATION_FAILED);
        }
    }
}
