package com.ssafy.BE.domain.video.subscriber;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.BE.domain.video.dto.JobProgressEvent;
import com.ssafy.BE.domain.video.service.JobSseService;
import com.ssafy.BE.domain.video.service.JobStateService;
import com.ssafy.BE.global.config.WatermarkProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * gemmark-be가 발행한 워터마크 진행 상태를 받아 SSE로 dispatch.
 *
 * 패턴 구독: watermark:progress:*
 * 메시지 본문: JobProgressEvent JSON
 * 채널 형식: watermark:progress:{jobId}
 *
 * RedisPubSubConfig에서 MessageListenerAdapter로 등록되어 onMessage(...) 호출됨.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JobProgressSubscriber implements MessageListener {

    private final ObjectMapper objectMapper;
    private final JobSseService sseService;
    private final JobStateService jobStateService;
    private final WatermarkProperties watermark;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        String body = new String(message.getBody(), StandardCharsets.UTF_8);

        String jobId = extractJobId(channel);
        if (jobId == null) {
            log.warn("[WM-PROGRESS] unparsable channel={}", channel);
            return;
        }

        JobProgressEvent event;
        try {
            event = objectMapper.readValue(body, JobProgressEvent.class);
        } catch (Exception e) {
            log.error("[WM-PROGRESS] deserialize failed jobId={} body={}", jobId, body, e);
            return;
        }

        log.debug("[WM-PROGRESS] jobId={} status={} percent={}",
                jobId, event.status(), event.percent());

        // Redis key snapshot 갱신 (만료 갱신 + 늦게 붙는 SSE 클라이언트가 현재 상태 받게)
        try {
            JobStateService.JobOwner owner = jobStateService.findOwner(jobId);
            jobStateService.save(jobId, owner.userId(), owner.videoId(), event);
        } catch (Exception e) {
            // 키가 만료/삭제됐을 수도 있음. SSE 송신은 시도.
            log.debug("[WM-PROGRESS] state save skipped jobId={} reason={}", jobId, e.getMessage());
        }

        sseService.send(jobId, event);
    }

    private String extractJobId(String channel) {
        String prefix = watermark.redisChannelPrefix() + ":";
        if (!channel.startsWith(prefix)) return null;
        return channel.substring(prefix.length());
    }
}
