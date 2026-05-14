package com.ssafy.BE.domain.video.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * gemmark-be → Redis Pub/Sub → gemcafe-be → SSE 로 흐르는 진행 상태 이벤트.
 *
 * 이벤트 종류는 status로 분기. SseEmitter는 status에 따라 'progress' / 'completed' / 'failed' name으로 emit.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record JobProgressEvent(
        String jobId,
        JobStatus status,
        Integer percent,
        String stage,
        String downloadUrl,
        String fileName,
        Long fileSize,
        String reason
) {
    public static JobProgressEvent initial(String jobId) {
        return new JobProgressEvent(jobId, JobStatus.PENDING, 0, "queued", null, null, null, null);
    }
}
