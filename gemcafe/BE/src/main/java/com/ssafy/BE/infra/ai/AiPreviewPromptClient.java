package com.ssafy.BE.infra.ai;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.ai.dto.AiPreviewPromptRequest;
import com.ssafy.BE.infra.ai.dto.AiPreviewPromptResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

@Slf4j
@Configuration
public class AiPreviewPromptClient {

    private final RestClient restClient;

    public AiPreviewPromptClient(AiProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("[AiPreviewPromptClient] baseUrl={}", props.baseUrl());
    }

    public AiPreviewPromptResponse preview(AiPreviewPromptRequest request) {
        log.info("[AI-PREVIEW] request simulation={} focus={} background={}",
                request.simulation(), request.focus(), request.background());
        try {
            AiPreviewPromptResponse response = restClient.post()
                    .uri("/preview-prompts")
                    .body(request)
                    .retrieve()
                    .body(AiPreviewPromptResponse.class);

            if (response == null || response.koreanPreview() == null) {
                throw new BusinessException(ErrorCode.AI_ANALYZE_FAILED);
            }
            log.info("[AI-PREVIEW] success len={}", response.koreanPreview().length());
            return response;
        } catch (ResourceAccessException e) {
            log.error("[AI-PREVIEW] connection/timeout: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_ANALYZE_UNREACHABLE);
        } catch (RestClientResponseException e) {
            log.error("[AI-PREVIEW] AI server returned error status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_ANALYZE_FAILED);
        }
    }
}
