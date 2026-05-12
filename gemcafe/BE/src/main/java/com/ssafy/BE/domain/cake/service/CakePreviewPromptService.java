package com.ssafy.BE.domain.cake.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.cake.dto.PreviewPromptRequest;
import com.ssafy.BE.domain.cake.dto.PreviewPromptResponse;
import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.entity.VideoSessionStatus;
import com.ssafy.BE.domain.video.repository.VideoSessionRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.ai.AiPreviewPromptClient;
import com.ssafy.BE.infra.ai.dto.AiPreviewPromptRequest;
import com.ssafy.BE.infra.ai.dto.AiPreviewPromptResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * "프롬프트 생성" 버튼 처리.
 *
 * AI 가 카탈로그의 단일 진실 소스(SSOT). simulation/background 키를 string 으로 그대로 받아 AI 에 패스.
 * BE 측 DB lookup 없음 (Simulation/Background 테이블은 안 씀).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CakePreviewPromptService {

    private final VideoSessionRepository videoSessionRepository;
    private final AiPreviewPromptClient aiPreviewPromptClient;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PreviewPromptResponse generate(Integer userId, Integer sessionId, PreviewPromptRequest request) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        validateSession(session, userId);

        AiPreviewPromptRequest aiRequest = new AiPreviewPromptRequest(
                request.simulationCode(),
                request.focus(),
                request.backgroundCode(),
                request.hint(),
                "케이크",
                null,
                parseAnalysis(session.getAnalysisJson())
        );
        AiPreviewPromptResponse aiResponse = aiPreviewPromptClient.preview(aiRequest);

        log.info("[CAKE-PREVIEW] sessionId={} simulation={} focus={}",
                sessionId, request.simulationCode(), request.focus());

        return new PreviewPromptResponse(aiResponse.koreanPreview());
    }

    private void validateSession(VideoSession session, Integer userId) {
        if (userId == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.SESSION_EXPIRED);
        }
        if (session.getStatus() == VideoSessionStatus.SUBMITTED
                || session.getStatus() == VideoSessionStatus.ABANDONED) {
            throw new BusinessException(ErrorCode.SESSION_INVALID_STATE);
        }
    }

    private Map<String, Object> parseAnalysis(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.warn("[CAKE-PREVIEW] analysis_json parse failed, sending null");
            return null;
        }
    }
}
