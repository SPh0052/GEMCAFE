package com.ssafy.BE.domain.video.dto;

/**
 * 워터마크 다운로드 응답.
 * gemcafe-be 가 gemmark-be 의 embed-from-path 를 동기 호출해 워터마크 파일을 생성한 직후 반환.
 * FE 는 downloadUrl 로 fetch + blob 다운로드 또는 공유 트리거.
 */
public record WatermarkDownloadResponse(
        String downloadUrl,
        String fileName,
        Long fileSize
) {}
