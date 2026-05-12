package com.ssafy.BE.domain.video.controller;

import com.ssafy.BE.domain.video.dto.JobProgressEvent;
import com.ssafy.BE.domain.video.service.JobSseService;
import com.ssafy.BE.domain.video.service.JobStateService;
import com.ssafy.BE.global.config.WatermarkProperties;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

@Slf4j
@Tag(name = "Job Stream", description = "비동기 작업 진행 상태 SSE 스트림")
@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobStreamController {

    private final JobStateService jobStateService;
    private final JobSseService jobSseService;
    private final WatermarkProperties watermark;

    @Operation(summary = "작업 진행 상태 SSE 스트림. 본인 작업만 구독 가능. 완료/실패 시 자동 종료.")
    @GetMapping(value = "/{jobId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @AuthenticationPrincipal Integer userId,
            @PathVariable String jobId
    ) {
        JobStateService.JobOwner owner = jobStateService.findOwner(jobId);

        if (userId == null || !owner.userId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }

        SseEmitter emitter = jobSseService.register(jobId, watermark.sseTimeoutMs());

        // 늦게 구독해서 Pub/Sub 메시지를 놓쳤어도 현재 상태 즉시 전송
        try {
            JobProgressEvent snapshot = owner.snapshot();
            if (snapshot != null) {
                jobSseService.send(jobId, snapshot);
            }
        } catch (Exception e) {
            log.warn("[SSE-SNAPSHOT-FAIL] jobId={} reason={}", jobId, e.getMessage());
        }

        log.info("[SSE-OPEN] jobId={} userId={}", jobId, userId);
        return emitter;
    }
}
