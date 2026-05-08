package com.ssafy.BE.domain.video.controller;

import com.ssafy.BE.domain.video.dto.VideoGenerationMessage;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.publisher.VideoGenerationPublisher;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Tag(name = "Video (Test)", description = "RabbitMQ + AI 호출 테스트용 - 추후 삭제 예정")
@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
public class VideoTestController {

    private static final DateTimeFormatter ORIGIN_NAME_FMT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss_SSS");

    private final VideoGenerationPublisher publisher;
    private final VideoRepository videoRepository;

    public record TestPublishRequest(
            Integer userId,
            Integer simulationId,
            Integer backgroundId,
            String startUrl,
            String endUrl,
            String videoPrompt,
            String userPrompt,
            String duration,
            String resolution,
            Boolean generateAudio
    ) {}

    @Operation(summary = "[임시] 더미 메시지 (DB row + 큐 발행). AI는 가짜 URL이라 실패함")
    @PostMapping("/test-publish")
    @Transactional
    public ApiResponse<VideoGenerationMessage> testPublish() {
        Video video = createPendingVideo(1, 1, 1, "테스트 더미 프롬프트");

        VideoGenerationMessage msg = VideoGenerationMessage.of(
                video.getId(),
                video.getUserId(),
                "https://example.com/start.png",
                "https://example.com/end.png",
                "Test dummy prompt"
        );
        publisher.publish(msg);
        return ApiResponse.ok("메시지 발행 완료", msg);
    }

    @Operation(summary = "[임시] 진짜 fal URL로 영상 생성 (DB row + 큐 발행)")
    @PostMapping("/test-publish-real")
    @Transactional
    public ApiResponse<VideoGenerationMessage> testPublishReal(@RequestBody TestPublishRequest body) {
        Video video = createPendingVideo(
                body.userId() != null ? body.userId() : 1,
                body.simulationId() != null ? body.simulationId() : 1,
                body.backgroundId() != null ? body.backgroundId() : 1,
                body.userPrompt()
        );

        VideoGenerationMessage msg = new VideoGenerationMessage(
                video.getId(),
                video.getUserId(),
                body.startUrl(),
                body.endUrl(),
                body.videoPrompt(),
                body.duration() != null ? body.duration() : "6s",
                body.resolution() != null ? body.resolution() : "720p",
                Boolean.TRUE.equals(body.generateAudio())
        );
        publisher.publish(msg);
        return ApiResponse.ok("메시지 발행 완료 (AI 호출 시작)", msg);
    }

    private Video createPendingVideo(Integer userId, Integer simulationId, Integer backgroundId, String userPrompt) {
        String origin = LocalDateTime.now().format(ORIGIN_NAME_FMT) + ".mp4";
        Video video = Video.builder()
                .userId(userId)
                .simulationId(simulationId)
                .backgroundId(backgroundId)
                .originFileName(origin)
                .storedFileName("pending.mp4")
                .fileType("mp4")
                .fileSize(0)
                .thumbnailFileName("pending.jpg")
                .userPrompt(userPrompt)
                .gem(6)
                .status(VideoStatus.GENERATING)
                .build();
        return videoRepository.save(video);
    }
}
