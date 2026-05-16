package com.ssafy.BE.domain.cake.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.cake.dto.SessionDetailResponse;
import com.ssafy.BE.domain.cake.dto.SessionListResponse;
import com.ssafy.BE.domain.video.entity.VideoKeyframe;
import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.entity.VideoSessionStatus;
import com.ssafy.BE.domain.video.repository.VideoKeyframeRepository;
import com.ssafy.BE.domain.video.repository.VideoSessionRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 시연 흐름 압축용 — video_session 의 진행 중 목록 / 상세 조회.
 *
 * 영상 생성 단계 진입 전(ANALYZED / KEYFRAMING / READY_TO_GENERATE) 세션만 대상.
 * 사용자가 단계별로 미리 만들어둔 세션을 골라 이어가도록 함.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CakeSessionQueryService {

    private static final String INPUT_IMAGE_URL_FMT = "/api/v1/files/sessions/%d/image";

    private static final List<VideoSessionStatus> IN_PROGRESS_STATUSES = List.of(
            VideoSessionStatus.ANALYZED,
            VideoSessionStatus.KEYFRAMING,
            VideoSessionStatus.READY_TO_GENERATE,
            VideoSessionStatus.SUBMITTED
    );

    private final VideoSessionRepository videoSessionRepository;
    private final VideoKeyframeRepository videoKeyframeRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SessionListResponse listInProgress(Integer userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        List<VideoSession> sessions = videoSessionRepository
                .findByUserIdAndStatusInAndExpiresAtAfterOrderByCreatedAtDesc(
                        userId, IN_PROGRESS_STATUSES, LocalDateTime.now());

        List<SessionListResponse.Item> items = sessions.stream()
                .map(this::toListItem)
                .toList();

        return new SessionListResponse(items, items.size());
    }

    @Transactional(readOnly = true)
    public SessionDetailResponse getDetail(Integer userId, Integer sessionId) {
        VideoSession session = videoSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));

        if (userId == null || !session.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        List<VideoKeyframe> keyframes = videoKeyframeRepository
                .findBySessionIdOrderByAttemptNumberAsc(sessionId);

        Map<String, Object> analysis = parseJson(session.getAnalysisJson());
        long expiresInSec = Duration.between(LocalDateTime.now(), session.getExpiresAt()).getSeconds();

        return new SessionDetailResponse(
                session.getId(),
                session.getStatus().name(),
                session.getCreatedAt(),
                session.getExpiresAt(),
                expiresInSec,
                session.getKeyframeAttempts(),
                session.getVideoId(),
                new SessionDetailResponse.InputImage(
                        session.getInputImageFileName(),
                        String.format(INPUT_IMAGE_URL_FMT, session.getId())
                ),
                session.getCrossSectionFileName(),
                analysis,
                new SessionDetailResponse.Selections(
                        session.getSimulationCode(),
                        session.getBackgroundCode(),
                        session.getFocus(),
                        session.getHint()
                ),
                session.getVideoPromptKr(),
                session.getSelectedKeyframeId(),
                keyframes.stream().map(this::toKeyframeInfo).toList()
        );
    }

    private SessionListResponse.Item toListItem(VideoSession s) {
        return new SessionListResponse.Item(
                s.getId(),
                s.getStatus().name(),
                s.getCreatedAt(),
                new SessionListResponse.InputImage(
                        s.getInputImageFileName(),
                        String.format(INPUT_IMAGE_URL_FMT, s.getId())
                )
        );
    }

    private SessionDetailResponse.KeyframeInfo toKeyframeInfo(VideoKeyframe kf) {
        return new SessionDetailResponse.KeyframeInfo(
                kf.getId(),
                kf.getAttemptNumber(),
                kf.getKeyframeUrl(),
                kf.getBaseUrl(),
                kf.getFrameStrategy(),
                kf.getVideoPrompt(),
                kf.getSeed(),
                parseJson(kf.getMetadata()),
                kf.isSelected(),
                kf.getCreatedAt()
        );
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("[SESSION-QUERY] JSON parse failed, returning null. raw='{}'",
                    json.length() > 80 ? json.substring(0, 80) + "..." : json);
            return null;
        }
    }
}
