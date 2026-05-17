package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.SocialUploadRequest;
import com.ssafy.BE.domain.video.dto.SocialUploadResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.uploadpost.UploadPostClient;
import com.ssafy.BE.infra.uploadpost.UploadPostProperties;
import com.ssafy.BE.infra.uploadpost.dto.UploadPostUploadResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * SNS 자동 게시 (YouTube Shorts / Instagram Reels) 오케스트레이션.
 *
 * <p>흐름:
 * <ol>
 *   <li>videoId 로 영상 조회 + 소유자 검증</li>
 *   <li>워터마크된 영상 파일 경로 확인 (gemmark-uploads 마운트)</li>
 *   <li>각 플랫폼별로 Upload-Post API 호출 (multipart)</li>
 *   <li>플랫폼별 결과 모아서 응답</li>
 * </ol>
 *
 * <p>주의: 데모용 MVP 라 모든 사용자가 동일한 default-user 프로필로 게시됨.
 * 사용자별 연결 분리는 추후 작업.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SocialUploadService {

    private static final String PLATFORM_YOUTUBE = "youtube";
    private static final String PLATFORM_INSTAGRAM = "instagram";
    private static final Set<String> SUPPORTED_PLATFORMS = Set.of(PLATFORM_YOUTUBE, PLATFORM_INSTAGRAM);

    private final VideoRepository videoRepository;
    private final UploadPostClient uploadPostClient;
    private final UploadPostProperties uploadPostProps;

    public SocialUploadResponse upload(Integer userId, Integer videoId, SocialUploadRequest request) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIDEO_NOT_FOUND));
        if (userId == null || !video.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        if (video.getStatus() != VideoStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VIDEO_NOT_READY);
        }

        // 워터마크된 파일 — gemmark 가 watermarked/ 디렉터리에 같은 파일명으로 저장.
        Path videoFile = Path.of(uploadPostProps.watermarkedMount(), video.getStoredFileName());
        if (!Files.exists(videoFile)) {
            log.error("[SOCIAL-UPLOAD] watermarked file not found: {}", videoFile);
            throw new BusinessException(ErrorCode.SOCIAL_UPLOAD_FILE_NOT_FOUND);
        }

        validatePlatforms(request.platforms());

        List<SocialUploadResponse.PlatformResult> results = new ArrayList<>();
        for (String platform : request.platforms()) {
            results.add(uploadToPlatform(videoFile, video, request, platform.toLowerCase()));
        }
        return new SocialUploadResponse(results);
    }

    private void validatePlatforms(List<String> platforms) {
        for (String p : platforms) {
            if (!SUPPORTED_PLATFORMS.contains(p == null ? "" : p.toLowerCase())) {
                throw new BusinessException(ErrorCode.SOCIAL_PLATFORM_INVALID);
            }
        }
    }

    /**
     * 단일 플랫폼 업로드. 한 플랫폼 실패가 다른 플랫폼 업로드를 막지 않도록
     * BusinessException 도 잡아 실패 결과로 변환.
     */
    private SocialUploadResponse.PlatformResult uploadToPlatform(
            Path videoFile, Video video, SocialUploadRequest request, String platform) {

        MultiValueMap<String, Object> body = UploadPostClient.emptyForm();
        body.add("platform[]", platform);

        if (PLATFORM_YOUTUBE.equals(platform)) {
            if (notBlank(request.description())) {
                body.add("youtube_description", request.description());
            }
            if (notBlank(request.tags())) {
                body.add("youtube_tags", request.tags());
            }
            body.add("youtube_visibility", "public");
            body.add("youtube_shorts", "true");
        } else if (PLATFORM_INSTAGRAM.equals(platform)) {
            String caption = notBlank(request.instagramCaption()) ? request.instagramCaption() : request.title();
            body.add("instagram_title", caption);
            body.add("media_type", "REELS");
            body.add("privacy_level", "PUBLIC");
        }

        if (notBlank(request.scheduledDate())) {
            body.add("scheduled_date", request.scheduledDate());
            if (notBlank(request.timezone())) {
                body.add("timezone", request.timezone());
            }
        }

        try {
            UploadPostUploadResponse resp = uploadPostClient.upload(
                    videoFile,
                    uploadPostProps.defaultUser(),
                    request.title(),
                    body
            );
            log.info("[SOCIAL-UPLOAD] platform={} videoId={} jobId={}",
                    platform, video.getId(), resp.jobId());
            return new SocialUploadResponse.PlatformResult(
                    platform,
                    true,
                    resp.jobId(),
                    resp.status(),
                    null
            );
        } catch (BusinessException e) {
            log.warn("[SOCIAL-UPLOAD] platform={} videoId={} failed: {}",
                    platform, video.getId(), e.getErrorCode().getMessage());
            return new SocialUploadResponse.PlatformResult(
                    platform,
                    false,
                    null,
                    "FAILED",
                    e.getErrorCode().getMessage()
            );
        }
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
