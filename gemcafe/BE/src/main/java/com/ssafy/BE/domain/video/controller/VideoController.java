package com.ssafy.BE.domain.video.controller;

import com.ssafy.BE.domain.video.dto.CreateVideoRequest;
import com.ssafy.BE.domain.video.dto.CreateVideoResponse;
import com.ssafy.BE.domain.video.dto.UpdateVideoRequest;
import com.ssafy.BE.domain.video.dto.UpdateVideoResponse;
import com.ssafy.BE.domain.video.dto.VideoDetailResponse;
import com.ssafy.BE.domain.video.dto.VideoDownloadResponse;
import com.ssafy.BE.domain.video.dto.VideoShareResponse;
import com.ssafy.BE.domain.video.dto.VideoStatusResponse;
import com.ssafy.BE.domain.video.dto.WatermarkDownloadResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.domain.video.service.VideoAssetService;
import com.ssafy.BE.domain.video.service.VideoGenerationService;
import com.ssafy.BE.domain.video.service.VideoWatermarkService;
import com.ssafy.BE.global.common.ApiResponse;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Video", description = "AI 영상 생성 진입점 + 진행 상태 조회")
@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoGenerationService videoGenerationService;
    private final VideoAssetService videoAssetService;
    private final VideoWatermarkService videoWatermarkService;
    private final VideoRepository videoRepository;

    @Operation(summary = "영상 생성 시작 (Step 8). 젬 6 차감 후 비동기 큐 발행")
    @PostMapping
    public ApiResponse<CreateVideoResponse> create(
            @AuthenticationPrincipal Integer userId,
            @Valid @RequestBody CreateVideoRequest request
    ) {
        CreateVideoResponse data = videoGenerationService.create(userId, request);
        return ApiResponse.ok("영상 생성 요청 완료", data);
    }

    @Operation(summary = "영상 생성 진행 상태 조회 (폴링용)")
    @GetMapping("/{videoId}/status")
    public ApiResponse<VideoStatusResponse> status(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIDEO_NOT_FOUND));
        if (userId == null || !video.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
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

    @Operation(summary = "영상 상세 조회. id/title/thumbnailUrl/videoUrl/createdAt 반환. URL은 보호된 서빙 컨트롤러 경로.")
    @GetMapping("/{videoId}")
    public ApiResponse<VideoDetailResponse> detail(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        VideoDetailResponse data = videoAssetService.getDetail(userId, videoId);
        return ApiResponse.ok("영상 상세 조회 완료", data);
    }

    @Operation(summary = "영상 편집 내용 저장. 제목 수정 + (선택) 영상/썸네일 파일 교체")
    @PatchMapping(value = "/{videoId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UpdateVideoResponse> update(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId,
            @Valid @ModelAttribute UpdateVideoRequest request,
            @RequestPart(value = "videoFile", required = false) MultipartFile videoFile,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail
    ) {
        UpdateVideoResponse data = videoAssetService.update(
                userId, videoId, request.title(), videoFile, thumbnail
        );
        return ApiResponse.ok("영상 수정 완료", data);
    }

    @Operation(summary = "영상 다운로드 정보 조회. 파일 URL + 원본 파일명 반환")
    @GetMapping("/{videoId}/download")
    public ApiResponse<VideoDownloadResponse> download(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        VideoDownloadResponse data = videoAssetService.getDownload(userId, videoId);
        return ApiResponse.ok("다운로드 정보 조회 완료", data);
    }

    @Operation(summary = "영상 공유 정보 조회. 영상 URL + 썸네일 + 제목 반환")
    @GetMapping("/{videoId}/share")
    public ApiResponse<VideoShareResponse> share(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        VideoShareResponse data = videoAssetService.getShare(userId, videoId);
        return ApiResponse.ok("공유 정보 조회 완료", data);
    }

    @Operation(summary = "워터마크 다운로드 요청. jobId 발급 + 비동기 워터마크 처리 시작. SSE로 진행 상태 폴링.")
    @PostMapping("/{videoId}/watermark-download")
    public ApiResponse<WatermarkDownloadResponse> watermarkDownload(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        WatermarkDownloadResponse data = videoWatermarkService.requestDownload(userId, videoId);
        return ApiResponse.ok("워터마크 다운로드 요청 완료", data);
    }
}
