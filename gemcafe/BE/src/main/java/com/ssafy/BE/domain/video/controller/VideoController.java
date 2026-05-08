package com.ssafy.BE.domain.video.controller;

import com.ssafy.BE.domain.video.dto.CreateVideoRequest;
import com.ssafy.BE.domain.video.dto.CreateVideoResponse;
import com.ssafy.BE.domain.video.dto.VideoDownloadResponse;
import com.ssafy.BE.domain.video.dto.VideoShareResponse;
import com.ssafy.BE.domain.video.dto.VideoStatusResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.domain.video.service.VideoAssetService;
import com.ssafy.BE.domain.video.service.VideoGenerationService;
import com.ssafy.BE.global.common.ApiResponse;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Video", description = "AI 영상 생성 진입점 + 진행 상태 조회")
@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoGenerationService videoGenerationService;
    private final VideoAssetService videoAssetService;
    private final VideoRepository videoRepository;

    @Operation(summary = "영상 생성 시작 (Step 8). 젬 6 차감 후 비동기 큐 발행")
    @PostMapping
    public ApiResponse<CreateVideoResponse> create(@Valid @RequestBody CreateVideoRequest request) {
        // TODO: 인증 적용 후 SecurityContext 에서 userId 꺼내기
        Integer userId = 1;
        CreateVideoResponse data = videoGenerationService.create(userId, request);
        return ApiResponse.ok("영상 생성 요청 완료", data);
    }

    @Operation(summary = "영상 생성 진행 상태 조회 (폴링용)")
    @GetMapping("/{videoId}/status")
    public ApiResponse<VideoStatusResponse> status(@PathVariable Integer videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIDEO_NOT_FOUND));
        VideoStatusResponse data = new VideoStatusResponse(
                video.getId(),
                video.getStatus().name(),
                video.getStoredFileName(),
                video.getThumbnailFileName(),
                video.getFileSize(),
                video.getCreatedAt()
        );
        return ApiResponse.ok("영상 상태 조회 완료", data);
    }

    @Operation(summary = "영상 다운로드 정보 조회. 파일 URL + 원본 파일명 반환")
    @GetMapping("/{videoId}/download")
    public ApiResponse<VideoDownloadResponse> download(@PathVariable Integer videoId) {
        VideoDownloadResponse data = videoAssetService.getDownload(videoId);
        return ApiResponse.ok("다운로드 정보 조회 완료", data);
    }

    @Operation(summary = "영상 공유 정보 조회. 영상 URL + 썸네일 + 제목 반환")
    @GetMapping("/{videoId}/share")
    public ApiResponse<VideoShareResponse> share(@PathVariable Integer videoId) {
        VideoShareResponse data = videoAssetService.getShare(videoId);
        return ApiResponse.ok("공유 정보 조회 완료", data);
    }
}
