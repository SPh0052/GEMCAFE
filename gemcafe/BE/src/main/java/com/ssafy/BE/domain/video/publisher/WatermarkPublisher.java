package com.ssafy.BE.domain.video.publisher;

import com.ssafy.BE.domain.video.dto.WatermarkRequestMessage;
import com.ssafy.BE.global.config.MqProperties;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WatermarkPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final MqProperties mq;

    public void publish(WatermarkRequestMessage message) {
        try {
            rabbitTemplate.convertAndSend(
                    mq.watermarkExchange(),
                    mq.routingKey().watermarkRequest(),
                    message
            );
            log.info("[WM-PUBLISH] jobId={} videoId={} routingKey={}",
                    message.jobId(), message.videoId(), mq.routingKey().watermarkRequest());
        } catch (AmqpException e) {
            log.error("[WM-PUBLISH-FAIL] jobId={} reason={}", message.jobId(), e.getMessage(), e);
            throw new BusinessException(ErrorCode.WATERMARK_JOB_PUBLISH_FAILED);
        }
    }
}
