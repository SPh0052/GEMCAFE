package com.ssafy.BE.domain.cake.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.cake.dto.CakeAnalyzeResponse;
import com.ssafy.BE.domain.image.dto.ImageUploadResponse;
import com.ssafy.BE.domain.image.service.ImageService;
import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.repository.VideoSessionRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.ai.AiAnalyzeClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CakeAnalyzeService {

    private static final int SESSION_EXPIRES_HOURS = 24;

    private final ImageService imageService;
    private final AiAnalyzeClient aiAnalyzeClient;
    private final VideoSessionRepository videoSessionRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public CakeAnalyzeResponse analyze(Integer userId, MultipartFile image) {
        ImageUploadResponse stored = imageService.upload(image);
        Map<String, Object> analysis = aiAnalyzeClient.analyze(image);

        VideoSession session = VideoSession.builder()
                .userId(userId)
                .inputImageFileName(stored.fileName())
                .analysisJson(toJson(analysis))
                .expiresAt(LocalDateTime.now().plusHours(SESSION_EXPIRES_HOURS))
                .build();
        VideoSession saved = videoSessionRepository.save(session);

        log.info("[CAKE-ANALYZE] sessionId={} userId={} image={}",
                saved.getId(), userId, stored.fileName());
        return new CakeAnalyzeResponse(saved.getId(), analysis);
    }

    private String toJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.AI_RESPONSE_PARSE_FAILED);
        }
    }
}
