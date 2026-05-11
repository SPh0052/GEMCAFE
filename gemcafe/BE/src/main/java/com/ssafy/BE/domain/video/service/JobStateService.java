package com.ssafy.BE.domain.video.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.video.dto.JobProgressEvent;
import com.ssafy.BE.global.config.WatermarkProperties;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 워터마크 job 상태를 Redis key에 저장/조회한다.
 *
 * key: watermark:job:{jobId}
 * value: JobProgressEvent JSON
 * TTL: WatermarkProperties.redisJobTtlMinutes
 *
 * SSE 클라이언트가 늦게 붙어서 Pub/Sub 메시지를 놓쳤어도 이 키로 현재 스냅샷 확인 가능.
 * 권한 검증(소유자 매칭)도 이 키의 userId로 수행.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobStateService {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final WatermarkProperties watermark;

    public record JobOwner(String jobId, Integer userId, Integer videoId, JobProgressEvent snapshot) {}

    public void initialize(String jobId, Integer userId, Integer videoId) {
        JobProgressEvent initial = JobProgressEvent.initial(jobId);
        save(jobId, userId, videoId, initial);
    }

    public void save(String jobId, Integer userId, Integer videoId, JobProgressEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(
                    new StoredJob(jobId, userId, videoId, event)
            );
            redis.opsForValue().set(
                    watermark.jobKeyFor(jobId),
                    payload,
                    Duration.ofMinutes(watermark.redisJobTtlMinutes())
            );
        } catch (JsonProcessingException e) {
            log.error("[JOB-STATE] serialize failed jobId={}", jobId, e);
            throw new BusinessException(ErrorCode.WATERMARK_PROGRESS_PARSE_FAILED);
        }
    }

    public JobOwner findOwner(String jobId) {
        String raw = redis.opsForValue().get(watermark.jobKeyFor(jobId));
        if (raw == null) {
            throw new BusinessException(ErrorCode.WATERMARK_JOB_NOT_FOUND);
        }
        try {
            StoredJob stored = objectMapper.readValue(raw, StoredJob.class);
            return new JobOwner(stored.jobId(), stored.userId(), stored.videoId(), stored.event());
        } catch (Exception e) {
            log.error("[JOB-STATE] deserialize failed jobId={} raw={}", jobId, raw, e);
            throw new BusinessException(ErrorCode.WATERMARK_PROGRESS_PARSE_FAILED);
        }
    }

    private record StoredJob(String jobId, Integer userId, Integer videoId, JobProgressEvent event) {}
}
