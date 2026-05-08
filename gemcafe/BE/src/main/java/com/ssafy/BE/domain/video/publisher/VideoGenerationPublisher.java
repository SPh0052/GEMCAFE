package com.ssafy.BE.domain.video.publisher;

import com.ssafy.BE.domain.video.dto.VideoGenerationMessage;
import com.ssafy.BE.global.config.MqProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class VideoGenerationPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final MqProperties mq;

    public void publish(VideoGenerationMessage message) {
        rabbitTemplate.convertAndSend(
                mq.exchange(),
                mq.routingKey().videoGenerate(),
                message
        );
        log.info("[MQ-PUBLISH] videoId={} routingKey={}", message.videoId(), mq.routingKey().videoGenerate());
    }
}
