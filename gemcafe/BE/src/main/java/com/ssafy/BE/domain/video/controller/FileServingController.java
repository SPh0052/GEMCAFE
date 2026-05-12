package com.ssafy.BE.domain.video.controller;

import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.domain.video.repository.VideoSessionRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.PostConstruct;

/**
 * 인증/소유권 검증이 필요한 정적 자원(영상/썸네일/원본 이미지) 서빙.
 *
 * 동작 방식: X-Accel-Redirect 패턴
 *   1. 컨트롤러가 인증 + 소유자 검증
 *   2. 통과 시 응답 헤더에 X-Accel-Redirect: /internal/... 를 설정
 *   3. nginx 가 응답을 가로채 /internal/ location 에서 실제 파일 서빙
 *   4. BE 는 바이트를 직접 전송하지 않으므로 JVM 메모리/CPU 부담 최소
 *
 * 보안:
 *   - /internal/ location 은 nginx 의 `internal;` 지시어로 외부 직접 접근 차단
 *   - BE 의 X-Accel-Redirect 헤더가 있는 응답만 진입 가능
 *   - 소유자 외의 사용자는 컨트롤러 단계에서 403 으로 차단
 */
@Slf4j
@Tag(name = "File", description = "보호된 정적 자원 서빙 (영상/썸네일/원본 이미지)")
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileServingController {

    // 환경별 internal prefix (DEV: /internal/dev, PROD: /internal/prod).
    // DEV/PROD 가 같은 nginx 의 같은 server 블록을 공유하므로 location 충돌 방지를 위해 분리.
    @Value("${app.file.internal-prefix:/internal}")
    private String internalPrefix;

    private String internalVideos;
    private String internalThumbs;
    private String internalImages;
    private String internalWatermarked;

    @PostConstruct
    void initPaths() {
        String base = internalPrefix.endsWith("/") ? internalPrefix.substring(0, internalPrefix.length() - 1) : internalPrefix;
        this.internalVideos = base + "/ai-videos/";
        this.internalThumbs = base + "/ai-videos/thumbnails/";
        this.internalImages = base + "/upload-images/";
        this.internalWatermarked = base + "/watermarked/";
        log.info("[FileServingController] internalPrefix={} videos={} thumbs={} images={} watermarked={}",
                internalPrefix, internalVideos, internalThumbs, internalImages, internalWatermarked);
    }

    private final VideoRepository videoRepository;
    private final VideoSessionRepository videoSessionRepository;

    @Operation(summary = "영상 파일 서빙. 소유자 검증 + X-Accel-Redirect 로 nginx 위임.")
    @GetMapping("/videos/{videoId}")
    public ResponseEntity<Void> serveVideo(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        Video video = ownedVideo(userId, videoId);
        if (video.getStatus() != VideoStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VIDEO_NOT_READY);
        }
        log.debug("[FILE-SERVE-VIDEO] videoId={} userId={} file={}",
                videoId, userId, video.getStoredFileName());
        return redirect(internalVideos + video.getStoredFileName(), "video/mp4");
    }

    @Operation(summary = "영상 썸네일 서빙. 소유자 검증.")
    @GetMapping("/videos/{videoId}/thumbnail")
    public ResponseEntity<Void> serveThumbnail(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        Video video = ownedVideo(userId, videoId);
        if (video.getStatus() != VideoStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VIDEO_NOT_READY);
        }
        log.debug("[FILE-SERVE-THUMB] videoId={} userId={} file={}",
                videoId, userId, video.getThumbnailFileName());
        return redirect(internalThumbs + video.getThumbnailFileName(), "image/jpeg");
    }

    @Operation(summary = "워터마크 영상 서빙. videoId 소유자 검증 + X-Accel-Redirect 로 nginx 위임. 파일명은 원본 영상과 동일하게 watermarked/ 디렉터리에 저장된 것.")
    @GetMapping("/watermark/{videoId}")
    public ResponseEntity<Void> serveWatermark(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer videoId
    ) {
        Video video = ownedVideo(userId, videoId);
        if (video.getStatus() != VideoStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VIDEO_NOT_READY);
        }
        log.debug("[FILE-SERVE-WATERMARK] videoId={} userId={} file={}",
                videoId, userId, video.getStoredFileName());
        return redirect(internalWatermarked + video.getStoredFileName(), "video/mp4");
    }

    @Operation(summary = "세션 업로드 원본 이미지 서빙. 세션 소유자 검증.")
    @GetMapping("/sessions/{sessionId}/image")
    public ResponseEntity<Void> serveSessionImage(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer sessionId
    ) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        if (userId == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        log.debug("[FILE-SERVE-IMAGE] sessionId={} userId={} file={}",
                sessionId, userId, session.getInputImageFileName());
        return redirect(internalImages + session.getInputImageFileName(), contentTypeFromName(session.getInputImageFileName()));
    }

    // =================================================================
    // helpers
    // =================================================================

    private Video ownedVideo(Integer userId, Integer videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIDEO_NOT_FOUND));
        if (userId == null || !video.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        return video;
    }

    /**
     * X-Accel-Redirect 응답 빌더. nginx 가 internal location 에서 실제 파일 전송.
     * Content-Type 은 BE 가 결정해 nginx 응답으로 그대로 노출.
     */
    private ResponseEntity<Void> redirect(String internalPath, String contentType) {
        return ResponseEntity.ok()
                .header("X-Accel-Redirect", internalPath)
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header("X-Content-Type-Options", "nosniff")
                .build();
    }

    private String contentTypeFromName(String fileName) {
        if (fileName == null) return "application/octet-stream";
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }
}
