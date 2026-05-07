package com.ssafy.BE.global.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class RabbitStartupChecker {

    @Bean
    public ApplicationRunner rabbitConnectionCheck(ConnectionFactory connectionFactory, RabbitAdmin rabbitAdmin) {
        return args -> {
            try (Connection conn = connectionFactory.createConnection()) {
                log.info("[RabbitMQ] Connection OK - host={}, port={}, open={}",
                        connectionFactory.getHost(),
                        connectionFactory.getPort(),
                        conn.isOpen());
                rabbitAdmin.initialize();
                log.info("[RabbitMQ] Queues/Exchanges/Bindings declared");
            } catch (Exception e) {
                log.error("[RabbitMQ] Connection FAILED: {}", e.getMessage(), e);
            }
        };
    }
}
