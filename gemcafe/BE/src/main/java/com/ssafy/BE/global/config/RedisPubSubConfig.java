package com.ssafy.BE.global.config;

import com.ssafy.BE.domain.video.subscriber.JobProgressSubscriber;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@EnableConfigurationProperties(WatermarkProperties.class)
public class RedisPubSubConfig {

    @Bean
    public RedisMessageListenerContainer jobProgressListenerContainer(
            RedisConnectionFactory connectionFactory,
            JobProgressSubscriber subscriber,
            WatermarkProperties watermark
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(
                subscriber,
                new PatternTopic(watermark.redisChannelPrefix() + ":*")
        );
        return container;
    }
}
