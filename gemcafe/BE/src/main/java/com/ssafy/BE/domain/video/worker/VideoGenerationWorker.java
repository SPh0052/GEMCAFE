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
            // 한국어 우선: videoPromptKr 가 있으면 AI 가 LLM 번역 + 잠금 라이브러리 결합 모드
            //              없으면 keyframe 생성 시 만들어진 영문 video_prompt 사용 (fallback)
            boolean useKoreanFlow = message.videoPromptKr() != null && !message.videoPromptKr().isBlank();
            AiVideoRequest request = new AiVideoRequest(
                    message.startUrl(),
                    message.endUrl(),
                    useKoreanFlow ? null : message.videoPrompt(),
                    useKoreanFlow ? message.videoPromptKr() : null,
                    useKoreanFlow ? message.simulationCode() : null,
                    useKoreanFlow ? message.backgroundCode() : null,
                    useKoreanFlow ? "veo-3.1" : null,
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
