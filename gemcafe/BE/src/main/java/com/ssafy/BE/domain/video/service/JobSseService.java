package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.JobProgressEvent;
import com.ssafy.BE.domain.video.dto.JobStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * jobId → SseEmitter 매핑을 관리.
 *
 * - 클라이언트가 GET /jobs/{id}/stream 연결 시 register
 * - JobProgressSubscriber가 Pub/Sub 메시지 받으면 send(jobId, event)
 * - status가 COMPLETED/FAILED면 자동 complete
 * - 클라이언트 끊김/타임아웃 시 자동 cleanup (SseEmitter 콜백)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobSseService {

    private final ConcurrentMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(String jobId, long timeoutMs) {
        SseEmitter previous = emitters.remove(jobId);
        if (previous != null) {
            try {
                previous.complete();
            } catch (Exception ignored) {
            }
        }

        SseEmitter emitter = new SseEmitter(timeoutMs);
        emitters.put(jobId, emitter);

        emitter.onCompletion(() -> {
            emitters.remove(jobId);
            log.debug("[SSE-COMPLETE] jobId={}", jobId);
        });
        emitter.onTimeout(() -> {
            emitters.remove(jobId);
            emitter.complete();
            log.debug("[SSE-TIMEOUT] jobId={}", jobId);
        });
        emitter.onError(ex -> {
            emitters.remove(jobId);
            log.warn("[SSE-ERROR] jobId={} reason={}", jobId, ex.getMessage());
        });

        log.info("[SSE-REGISTER] jobId={}", jobId);
        return emitter;
    }

    public void send(String jobId, JobProgressEvent event) {
        SseEmitter emitter = emitters.get(jobId);
        if (emitter == null) {
            return;
        }
        try {
            emitter.send(SseEmitter.event()
                    .name(resolveEventName(event.status()))
                    .data(event));
            if (isTerminal(event.status())) {
                emitter.complete();
            }
        } catch (IOException e) {
            log.warn("[SSE-SEND-FAIL] jobId={} reason={}", jobId, e.getMessage());
            emitters.remove(jobId);
            emitter.completeWithError(e);
        }
    }

    private String resolveEventName(JobStatus status) {
        if (status == null) return "progress";
        return switch (status) {
            case COMPLETED -> "completed";
            case FAILED -> "failed";
            default -> "progress";
        };
    }

    private boolean isTerminal(JobStatus status) {
        return status == JobStatus.COMPLETED || status == JobStatus.FAILED;
    }
}
