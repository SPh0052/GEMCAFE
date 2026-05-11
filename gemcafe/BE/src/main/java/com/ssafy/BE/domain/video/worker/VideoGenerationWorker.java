package com.ssafy.BE.domain.video.worker;

import com.ssafy.BE.domain.video.dto.VideoGenerationMessage;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.domain.video.service.VideoFileService;
import com.ssafy.BE.domain.video.service.VideoGenerationService;
import com.ssafy.BE.infra.ai.AiVideoClient;
import com.ssafy.BE.infra.ai.dto.AiVideoRequest;
import com.ssafy.BE.infra.ai.dto.AiVideoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class VideoGenerationWorker {

    private final AiVideoClient aiVideoClient;
    private final VideoRepository videoRepository;
    private final VideoFileService videoFileService;
    private final VideoGenerationService videoGenerationService;

    @RabbitListener(queues = "${app-mq.queue.video-generate}")
    public void onVideoGenerationMessage(VideoGenerationMessage message) {
        log.info("[MQ-CONSUME] videoId={} userId={}", message.videoId(), message.userId());

        Video video = videoRepository.findById(message.videoId()).orElse(null);
        if (video == null) {
            log.error("[VIDEO-FAIL] videoId={} not found in DB. dropping message.", message.videoId());
            return;
        }

        try {
            AiVideoRequest request = new AiVideoRequest(
                    message.startUrl(),
                    message.endUrl(),
                    message.videoPrompt(),
                    message.duration(),
                    message.resolution(),
                    Boolean.TRUE.equals(message.generateAudio())
            );

            AiVideoResponse aiResponse = aiVideoClient.generate(request);
            VideoFileService.StoredVideo stored = videoFileService.downloadAndThumbnail(aiResponse.videoUrl());

            videoGenerationService.completeVideo(video.getId(), stored);
            log.info("[VIDEO-DONE] videoId={} stored={} size={} thumb={}",
                    video.getId(), stored.storedFileName(), stored.fileSize(), stored.thumbnailFileName());

        } catch (Exception e) {
            log.error("[VIDEO-FAIL] videoId={} reason={}", video.getId(), e.getMessage(), e);
            videoGenerationService.failVideoAndRefund(video.getId(), video.getUserId(), video.getGem());
        }
    }
}
