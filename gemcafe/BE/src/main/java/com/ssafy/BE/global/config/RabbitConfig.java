package com.ssafy.BE.global.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MqProperties.class)
public class RabbitConfig {

    private final MqProperties mq;

    public RabbitConfig(MqProperties mq) {
        this.mq = mq;
    }

    @Bean
    public TopicExchange gemcafeExchange() {
        return new TopicExchange(mq.exchange(), true, false);
    }

    @Bean
    public TopicExchange watermarkExchange() {
        return new TopicExchange(mq.watermarkExchange(), true, false);
    }

    @Bean
    public Queue videoGenerateQueue() {
        return new Queue(mq.queue().videoGenerate(), true);
    }

    @Bean
    public Queue watermarkRequestQueue() {
        return new Queue(mq.queue().watermarkRequest(), true);
    }

    @Bean
    public Binding videoGenerateBinding(Queue videoGenerateQueue, TopicExchange gemcafeExchange) {
        return BindingBuilder
                .bind(videoGenerateQueue)
                .to(gemcafeExchange)
                .with(mq.routingKey().videoGenerate());
    }

    @Bean
    public Binding watermarkRequestBinding(Queue watermarkRequestQueue, TopicExchange watermarkExchange) {
        return BindingBuilder
                .bind(watermarkRequestQueue)
                .to(watermarkExchange)
                .with(mq.routingKey().watermarkRequest());
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }

    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        return new RabbitAdmin(connectionFactory);
    }
}
