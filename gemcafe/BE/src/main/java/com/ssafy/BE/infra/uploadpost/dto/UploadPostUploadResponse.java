package com.ssafy.BE.infra.uploadpost.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Upload-Post API 의 업로드 응답.
 * <a href="https://www.upload-post.com/">https://www.upload-post.com/</a>
 *
 * 추가 필드는 무시하도록 ignoreUnknown=true.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UploadPostUploadResponse(
        Boolean success,
        String jobId,
        String platform,
        String status,
        String message
) {}
