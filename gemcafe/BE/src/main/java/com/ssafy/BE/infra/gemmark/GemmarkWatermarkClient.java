package com.ssafy.BE.infra.gemmark;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.gemmark.dto.GemmarkEmbedFromPathRequest;
import com.ssafy.BE.infra.gemmark.dto.GemmarkEmbedFromPathResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * gemmark 의 워터마크 삽입 API (gateway-net 내부 호출).
 * embed-from-path 는 등록부/DB skip 하고 ffmpeg 만 돌리는 경량 경로.
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(GemmarkProperties.class)
public class GemmarkWatermarkClient {

    private final RestClient restClient;

    public GemmarkWatermarkClient(GemmarkProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("[GemmarkWatermarkClient] baseUrl={}", props.baseUrl());
    }

    public GemmarkEmbedFromPathResponse embedFromPath(GemmarkEmbedFromPathRequest request) {
        log.info("[GEMMARK-EMBED] sourceFilePath={} downloaderUserId={}",
                request.sourceFilePath(), request.downloaderUserId());
        try {
            GemmarkEmbedFromPathResponse response = restClient.post()
                    .uri("/api/v1/watermark/embed-from-path")
                    .body(request)
                    .retrieve()
                    .body(GemmarkEmbedFromPathResponse.class);

            if (response == null || response.storedFileName() == null) {
                throw new BusinessException(ErrorCode.WATERMARK_EMBED_FAILED);
            }
            log.info("[GEMMARK-EMBED] success file={} size={}",
                    response.storedFileName(), response.fileSize());
            return response;
        } catch (ResourceAccessException e) {
            log.error("[GEMMARK-EMBED] connection/timeout: {}", e.getMessage());
            throw new BusinessException(ErrorCode.WATERMARK_EMBED_UNREACHABLE);
        } catch (RestClientResponseException e) {
            log.error("[GEMMARK-EMBED] gemmark returned status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.WATERMARK_EMBED_FAILED);
        }
    }
}
