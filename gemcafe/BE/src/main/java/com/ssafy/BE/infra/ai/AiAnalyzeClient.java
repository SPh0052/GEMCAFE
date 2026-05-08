package com.ssafy.BE.infra.ai;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;

@Slf4j
@Configuration
public class AiAnalyzeClient {

    private final RestClient restClient;

    public AiAnalyzeClient(AiProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .build();

        log.info("[AiAnalyzeClient] baseUrl={}", props.baseUrl());
    }

    public Map<String, Object> analyze(MultipartFile image) {
        log.info("[AI-ANALYZE] request start filename={}", image.getOriginalFilename());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", image.getResource());

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                throw new BusinessException(ErrorCode.AI_ANALYZE_FAILED);
            }
            log.info("[AI-ANALYZE] success keys={}", response.keySet());
            return response;
        } catch (ResourceAccessException e) {
            log.error("[AI-ANALYZE] connection/timeout: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_ANALYZE_UNREACHABLE);
        } catch (RestClientResponseException e) {
            log.error("[AI-ANALYZE] AI server returned error status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_ANALYZE_FAILED);
        }
    }
}
