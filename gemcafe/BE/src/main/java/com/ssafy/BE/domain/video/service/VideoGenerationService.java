package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.user.entity.User;
import com.ssafy.BE.domain.user.repository.UserRepository;
import com.ssafy.BE.domain.video.dto.CreateVideoRequest;
import com.ssafy.BE.domain.video.dto.CreateVideoResponse;
import com.ssafy.BE.domain.video.dto.VideoGenerationMessage;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoKeyframe;
import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.entity.VideoSessionStatus;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.publisher.VideoGenerationPublisher;
import com.ssafy.BE.domain.video.repository.VideoKeyframeRepository;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.domain.video.repository.VideoSessionRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoGenerationService {

    private static final int GEM_COST = 6;
    private static final DateTimeFormatter ORIGIN_NAME_FMT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss_SSS");

    private final UserRepository userRepository;
    private final VideoSessionRepository videoSessionRepository;
    private final VideoKeyframeRepository videoKeyframeRepository;
    private final VideoRepository videoRepository;
    private final VideoGenerationPublisher publisher;

    @Transactional
    public CreateVideoResponse create(Integer userId, CreateVideoRequest request) {
        VideoSession session = videoSessionRepository.findById(request.sessionId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        validateSession(session, userId);

        VideoKeyframe keyframe = videoKeyframeRepository.findById(session.getSelectedKeyframeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.KEYFRAME_NOT_FOUND));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (user.getGem() < GEM_COST) {
            throw new BusinessException(ErrorCode.GEM_INSUFFICIENT);
        }
        user.deductGem(GEM_COST);

        Video video = createVideoRow(session, request.userPrompt());
        session.submit(video.getId());

        VideoGenerationMessage message = buildMessage(video.getId(), userId, keyframe, session);
        // 트랜잭션 commit 이후에 publish — 안 그러면 Worker 가 commit 전 메시지 받아서
        // findById 실패("not found, dropping message") → 영상이 GENERATING 상태로 영원히 멈춤.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publisher.publish(message);
            }
        });

        log.info("[VIDEO-CREATE] videoId={} sessionId={} userId={} gem={}",
                video.getId(), session.getId(), userId, GEM_COST);

        return new CreateVideoResponse(
                video.getId(),
                session.getId(),
                video.getStatus().name(),
                GEM_COST
        );
    }

    private void validateSession(VideoSession session, Integer userId) {
        if (!session.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.SESSION_INVALID_STATE);
        }
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.SESSION_EXPIRED);
        }
        if (session.getStatus() != VideoSessionStatus.READY_TO_GENERATE) {
            throw new BusinessException(ErrorCode.SESSION_INVALID_STATE);
        }
        if (session.getSelectedKeyframeId() == null) {
            throw new BusinessException(ErrorCode.KEYFRAME_NOT_SELECTED);
        }
    }

    private Video createVideoRow(VideoSession session, String userPrompt) {
        String origin = LocalDateTime.now().format(ORIGIN_NAME_FMT) + ".mp4";
        Video video = Video.builder()
                .userId(session.getUserId())
                .simulationCode(session.getSimulationCode())
                .backgroundCode(session.getBackgroundCode())
                .originFileName(origin)
                .storedFileName("pending.mp4")
                .fileType("mp4")
                .fileSize(0)
                .thumbnailFileName("pending.jpg")
                .userPrompt(userPrompt)
                .gem(GEM_COST)
                .status(VideoStatus.GENERATING)
                .build();
        return videoRepository.save(video);
    }

    private VideoGenerationMessage buildMessage(
            Integer videoId, Integer userId, VideoKeyframe keyframe, VideoSession session) {
        String startUrl;
        String endUrl;
        if ("i2i_is_end".equals(keyframe.getFrameStrategy())) {
            startUrl = keyframe.getBaseUrl();
            endUrl = keyframe.getKeyframeUrl();
        } else {
            startUrl = keyframe.getKeyframeUrl();
            endUrl = keyframe.getBaseUrl();
        }

        return VideoGenerationMessage.of(
                videoId,
                userId,
                startUrl,
                endUrl,
                keyframe.getVideoPrompt(),
                session.getVideoPromptKr(),
                session.getSimulationCode(),
                session.getBackgroundCode()
        );
    }

    @Transactional
    public void completeVideo(Integer videoId, VideoFileService.StoredVideo stored) {
        Video video = videoRepository.findById(videoId).orElseThrow();
        video.markCompleted(stored.storedFileName(), (int) stored.fileSize(), stored.thumbnailFileName());
    }

    @Transactional
    public void failVideoAndRefund(Integer videoId, Integer userId, int gemAmount) {
        videoRepository.findById(videoId).ifPresent(Video::markFailed);
        userRepository.findById(userId).ifPresent(user -> {
            user.refundGem(gemAmount);
            log.info("[GEM-REFUND] userId={} amount={}", userId, gemAmount);
        });
    }
}
