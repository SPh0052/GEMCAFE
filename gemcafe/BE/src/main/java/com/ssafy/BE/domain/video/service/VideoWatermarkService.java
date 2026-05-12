package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.WatermarkDownloadResponse;
import com.ssafy.BE.domain.video.dto.WatermarkRequestMessage;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.publisher.WatermarkPublisher;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.config.WatermarkProperties;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoWatermarkService {

    private static final String VIDEO_SUBDIR = "ai-videos";
    private static final String SSE_URL_TEMPLATE = "/api/v1/jobs/%s/stream";

    private final VideoRepository videoRepository;
    private final JobStateService jobStateService;
    private final WatermarkPublisher watermarkPublisher;
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

        String jobId = "wm_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String sourceFilePath = buildSourcePath(video.getStoredFileName());

        jobStateService.initialize(jobId, userId, videoId);

        WatermarkRequestMessage message = new WatermarkRequestMessage(
                jobId,
                userId,
                videoId,
                sourceFilePath,
                String.valueOf(userId),
                watermark.alpha()
        );
        watermarkPublisher.publish(message);

        log.info("[WM-REQUEST] jobId={} userId={} videoId={} sourcePath={}",
                jobId, userId, videoId, sourceFilePath);

        return new WatermarkDownloadResponse(jobId, String.format(SSE_URL_TEMPLATE, jobId));
    }

    private String buildSourcePath(String storedFileName) {
        // gemmark 컨테이너에 마운트된 경로 기준. 예: /app/gemcafe-uploads/ai-videos/uuid.mp4
        return watermark.sourceMountPrefix() + "/" + videoSubdir + "/" + storedFileName;
    }
}
