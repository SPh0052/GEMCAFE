package com.ssafy.BE.domain.cake.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.background.entity.Background;
import com.ssafy.BE.domain.background.repository.BackgroundRepository;
import com.ssafy.BE.domain.background.service.BackgroundAiMapper;
import com.ssafy.BE.domain.cake.dto.PreviewPromptRequest;
import com.ssafy.BE.domain.cake.dto.PreviewPromptResponse;
import com.ssafy.BE.domain.simulation.entity.Simulation;
import com.ssafy.BE.domain.simulation.repository.SimulationRepository;
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
 * 사용자가 선택한 시뮬레이션/배경/요소/힌트를 받아 AI 서비스의 LLM이
 * 자연스러운 한국어 영상 묘사를 생성하여 반환. 사용자는 이 결과를
 * 화면에서 보고 수정한 뒤 키프레임 선택 단계에서 최종 텍스트를 저장한다.
 *
 * 이 단계는 stateless 하다 (세션에 저장 X). 저장은 select-keyframe 시점.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CakePreviewPromptService {

    private final VideoSessionRepository videoSessionRepository;
    private final SimulationRepository simulationRepository;
    private final BackgroundRepository backgroundRepository;
    private final BackgroundAiMapper backgroundAiMapper;
    private final AiPreviewPromptClient aiPreviewPromptClient;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PreviewPromptResponse generate(Integer userId, Integer sessionId, PreviewPromptRequest request) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        validateSession(session, userId);

        Simulation simulation = simulationRepository.findById(request.simulationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SIMULATION_NOT_FOUND));
        Background background = backgroundRepository.findById(request.backgroundId())
                .orElseThrow(() -> new BusinessException(ErrorCode.BACKGROUND_NOT_FOUND));

        String aiBackgroundCode = backgroundAiMapper.resolveAiCode(background);
        String mergedHint = backgroundAiMapper.mergeHint(background, request.hint());

        AiPreviewPromptRequest aiRequest = new AiPreviewPromptRequest(
                simulation.getCode(),
                request.focus(),
                aiBackgroundCode,
                mergedHint,
                "케이크",
                null,
                parseAnalysis(session.getAnalysisJson())
        );
        AiPreviewPromptResponse aiResponse = aiPreviewPromptClient.preview(aiRequest);

        log.info("[CAKE-PREVIEW] sessionId={} simulation={} focus={}",
                sessionId, simulation.getCode(), request.focus());

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
