package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.WatermarkDownloadResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.config.WatermarkProperties;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.gemmark.GemmarkWatermarkClient;
import com.ssafy.BE.infra.gemmark.dto.GemmarkEmbedFromPathRequest;
import com.ssafy.BE.infra.gemmark.dto.GemmarkEmbedFromPathResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 워터마크 삽입 + 다운로드 URL 발급.
 *
 * 동기 흐름: gemcafe-be → gemmark-be(/watermark/embed-from-path) HTTP 호출 →
 * gemmark 가 ffmpeg 로 워터마크 입혀 watermarked/ 디렉터리에 저장 →
 * gemcafe-be 가 파일명 받아 보호된 다운로드 URL 구성해 응답.
 *
 * FE 는 응답의 downloadUrl 로 fetch + blob 다운로드 (또는 Web Share API 호출).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VideoWatermarkService {

    private static final String VIDEO_SUBDIR = "ai-videos";
    private static final String DOWNLOAD_URL_FMT = "/api/v1/files/watermark/%d";

    private final VideoRepository videoRepository;
    private final GemmarkWatermarkClient gemmarkClient;
    private final WatermarkProperties watermark;

    @Value("${app-video.subdir}")
    private String videoSubdir;

    public WatermarkDownloadResponse requestDownload(Integer userId, Integer videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIDEO_NOT_FOUND));

        if (userId == null || !video.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        if (video.getStatus() != VideoStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VIDEO_NOT_READY);
        }

        String sourceFilePath = buildSourcePath(video.getStoredFileName());

        GemmarkEmbedFromPathResponse result = gemmarkClient.embedFromPath(
                new GemmarkEmbedFromPathRequest(
                        sourceFilePath,
                        String.valueOf(userId),
                        watermark.alpha()
                )
        );

        log.info("[WM-EMBED] userId={} videoId={} sourcePath={} resultFile={} size={}",
                userId, videoId, sourceFilePath, result.storedFileName(), result.fileSize());

        return new WatermarkDownloadResponse(
                String.format(DOWNLOAD_URL_FMT, video.getId()),
                result.storedFileName(),
                result.fileSize()
        );
    }

    private String buildSourcePath(String storedFileName) {
        // gemmark 컨테이너에 마운트된 경로 기준. 예: /app/gemcafe-uploads/ai-videos/uuid.mp4
        return watermark.sourceMountPrefix() + "/" + videoSubdir + "/" + storedFileName;
    }
}
