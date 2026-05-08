package com.ssafy.BE.infra.ai;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;

@Slf4j
@Configuration
public class AiKeyframeClient {

    private final RestClient restClient;

    public AiKeyframeClient(AiProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .build();

        log.info("[AiKeyframeClient] baseUrl={}", props.baseUrl());
    }

    public Map<String, Object> generate(Path imagePath, String simulation, String focus,
                                        String background, String hint, Integer seed) {
        log.info("[AI-KEYFRAME] request start image={} simulation={} focus={} background={} seed={}",
                imagePath.getFileName(), simulation, focus, background, seed);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", new FileSystemResource(imagePath));
        body.add("simulation", simulation);
        if (focus != null) body.add("focus", focus);
        if (background != null) body.add("background", background);
        if (hint != null) body.add("hint", hint);
        if (seed != null) body.add("seed", seed.toString());

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/keyframe")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null || response.get("keyframe_url") == null) {
                throw new BusinessException(ErrorCode.AI_KEYFRAME_FAILED);
            }
            log.info("[AI-KEYFRAME] success keyframe_url={}", response.get("keyframe_url"));
            return response;
        } catch (ResourceAccessException e) {
            log.error("[AI-KEYFRAME] connection/timeout: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_KEYFRAME_UNREACHABLE);
        } catch (RestClientResponseException e) {
            log.error("[AI-KEYFRAME] AI server returned error status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_KEYFRAME_FAILED);
        }
    }
}
