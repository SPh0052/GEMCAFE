package com.ssafy.BE.domain.cake.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.cake.dto.KeyframeGenerateRequest;
import com.ssafy.BE.domain.cake.dto.KeyframeGenerateResponse;
import com.ssafy.BE.domain.cake.dto.KeyframeSelectRequest;
import com.ssafy.BE.domain.cake.dto.KeyframeSelectResponse;
import com.ssafy.BE.domain.video.entity.VideoKeyframe;
import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.entity.VideoSessionStatus;
import com.ssafy.BE.domain.video.repository.VideoKeyframeRepository;
import com.ssafy.BE.domain.video.repository.VideoSessionRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.ai.AiKeyframeClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CakeKeyframeService {

    private static final int MAX_KEYFRAME_ATTEMPTS = 3;
    private static final String IMAGE_SUBDIR = "upload-images";

    private final VideoSessionRepository videoSessionRepository;
    private final VideoKeyframeRepository videoKeyframeRepository;
    private final AiKeyframeClient aiKeyframeClient;
    private final ObjectMapper objectMapper;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Transactional
    public KeyframeGenerateResponse generate(Integer userId, Integer sessionId, KeyframeGenerateRequest request) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));

        validateSessionOwner(session, userId);
        validateSessionForKeyframe(session);

        Path imagePath = Path.of(uploadDir, IMAGE_SUBDIR, session.getInputImageFileName());
        if (!Files.exists(imagePath)) {
            log.error("[CAKE-KEYFRAME] image not found: {}", imagePath);
            throw new BusinessException(ErrorCode.IMAGE_CORRUPTED);
        }

        Integer seed = generateSeed(session.getKeyframeAttempts());

        Map<String, Object> aiResponse = aiKeyframeClient.generate(
                imagePath,
                request.simulationCode(),
                request.focus(),
                request.backgroundCode(),
                request.hint(),
                seed
        );

        session.updateChoices(request.simulationCode(), request.backgroundCode(), request.focus(), request.hint());
        session.incrementKeyframeAttempts();

        VideoKeyframe keyframe = VideoKeyframe.builder()
                .sessionId(sessionId)
                .attemptNumber(session.getKeyframeAttempts())
                .keyframeUrl((String) aiResponse.get("keyframe_url"))
                .baseUrl((String) aiResponse.get("base_url"))
                .frameStrategy((String) aiResponse.get("frame_strategy"))
                .videoPrompt((String) aiResponse.get("video_prompt"))
                .seed(seed)
                .metadata(toJson(aiResponse))
                .build();
        VideoKeyframe saved = videoKeyframeRepository.save(keyframe);

        log.info("[CAKE-KEYFRAME] sessionId={} attemptNumber={} keyframeId={}",
                sessionId, saved.getAttemptNumber(), saved.getId());

        return new KeyframeGenerateResponse(saved.getId(), saved.getAttemptNumber(), saved.getKeyframeUrl());
    }

    @Transactional
    public KeyframeSelectResponse select(Integer userId, Integer sessionId, KeyframeSelectRequest request) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        validateSessionOwner(session, userId);
        validateNotExpired(session);

        VideoKeyframe target = videoKeyframeRepository.findById(request.keyframeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.KEYFRAME_NOT_FOUND));
        if (!target.getSessionId().equals(sessionId)) {
            throw new BusinessException(ErrorCode.KEYFRAME_SESSION_MISMATCH);
        }

        List<VideoKeyframe> all = videoKeyframeRepository.findBySessionIdOrderByAttemptNumberAsc(sessionId);
        for (VideoKeyframe k : all) {
            if (k.getId().equals(target.getId())) {
                k.markSelected();
            } else {
                k.unselect();
            }
        }

        session.selectKeyframe(target.getId());
        if (request.videoPromptKr() != null && !request.videoPromptKr().isBlank()) {
            session.updateVideoPromptKr(request.videoPromptKr().trim());
        }
        log.info("[CAKE-KEYFRAME-SELECT] sessionId={} keyframeId={} hasPromptKr={}",
                sessionId, target.getId(),
                request.videoPromptKr() != null && !request.videoPromptKr().isBlank());

        return new KeyframeSelectResponse(sessionId, target.getId(), session.getStatus().name());
    }

    private void validateSessionForKeyframe(VideoSession session) {
        validateNotExpired(session);
        if (session.getStatus() != VideoSessionStatus.ANALYZED
                && session.getStatus() != VideoSessionStatus.KEYFRAMING) {
            throw new BusinessException(ErrorCode.SESSION_INVALID_STATE);
        }
        if (session.getKeyframeAttempts() >= MAX_KEYFRAME_ATTEMPTS) {
            throw new BusinessException(ErrorCode.KEYFRAME_LIMIT_EXCEEDED);
        }
    }

    private void validateNotExpired(VideoSession session) {
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.SESSION_EXPIRED);
        }
    }

    private void validateSessionOwner(VideoSession session, Integer userId) {
        if (userId == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
    }

    private Integer generateSeed(int previousAttempts) {
        return (int) (System.currentTimeMillis() % Integer.MAX_VALUE) + previousAttempts;
    }

    private String toJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.AI_RESPONSE_PARSE_FAILED);
        }
    }
}
