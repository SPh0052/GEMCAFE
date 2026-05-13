package com.ssafy.BE.infra.uploadpost;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.uploadpost.dto.UploadPostUploadResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.file.Path;
import java.time.Duration;

/**
 * Upload-Post 의 동영상 업로드 API (multipart/form-data) 호출 래퍼.
 *
 * <p>API: <a href="https://www.upload-post.com/ko/how-to/auto-post-youtube-shorts/">Upload-Post Docs</a>
 *
 * <p>핵심 동작:
 * <ol>
 *   <li>워터마크된 영상 파일을 BE 디스크에서 읽어 multipart 로 전송</li>
 *   <li>플랫폼별 (YouTube / Instagram) 메타데이터 함께 전달</li>
 *   <li>응답의 jobId 반환 — FE 가 게시 상태 추적 시 사용</li>
 * </ol>
 *
 * <p>인증: HTTP Header {@code Authorization: ApiKey <KEY>}.
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(UploadPostProperties.class)
public class UploadPostClient {

    private final RestClient restClient;
    private final String apiKey;

    public UploadPostClient(UploadPostProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));

        this.apiKey = props.apiKey();
        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .build();

        log.info("[UploadPostClient] baseUrl={} defaultUser={} keyConfigured={}",
                props.baseUrl(), props.defaultUser(), apiKey != null && !apiKey.isBlank());
    }

    /**
     * 영상 1건 업로드.
     *
     * @param videoFile     워터마크된 영상 파일 (BE 디스크 경로)
     * @param user          Upload-Post 의 프로필명
     * @param title         기본 title (YouTube 가 사용)
     * @param body          이미 platform / description / tags 등 채워진 multipart 폼
     * @return Upload-Post 응답
     */
    public UploadPostUploadResponse upload(Path videoFile, String user, String title, MultiValueMap<String, Object> body) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException(ErrorCode.SOCIAL_UPLOAD_FAILED);
        }
        body.add("video", new FileSystemResource(videoFile));
        body.add("user", user);
        body.add("title", title);

        log.info("[UPLOAD-POST] uploading file={} user={} title={} fields={}",
                videoFile.getFileName(), user, title, body.keySet());

        try {
            UploadPostUploadResponse response = restClient.post()
                    .uri("/api/upload")
                    .header(HttpHeaders.AUTHORIZATION, "ApiKey " + apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(UploadPostUploadResponse.class);

            if (response == null || !Boolean.TRUE.equals(response.success())) {
                log.error("[UPLOAD-POST] non-success response: {}", response);
                throw new BusinessException(ErrorCode.SOCIAL_UPLOAD_FAILED);
            }
            log.info("[UPLOAD-POST] success jobId={} platform={} status={}",
                    response.jobId(), response.platform(), response.status());
            return response;
        } catch (ResourceAccessException e) {
            log.error("[UPLOAD-POST] connection/timeout: {}", e.getMessage());
            throw new BusinessException(ErrorCode.SOCIAL_UPLOAD_UNREACHABLE);
        } catch (RestClientResponseException e) {
            log.error("[UPLOAD-POST] error status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.SOCIAL_UPLOAD_FAILED);
        }
    }

    /**
     * multipart 본문을 빌더 패턴으로 만들기 위한 헬퍼.
     */
    public static MultiValueMap<String, Object> emptyForm() {
        return new LinkedMultiValueMap<>();
    }
}
