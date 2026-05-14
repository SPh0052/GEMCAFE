package com.ssafy.BE.security.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * JWT 무효화 블랙리스트 (Redis 기반).
 * 키 형태: auth:blacklist:{jti} → 값 "1" (존재 자체로 블랙리스트 의미)
 * TTL은 토큰의 남은 만료 시간을 그대로 적용 → 만료 후 자동 정리.
 */
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String KEY_PREFIX = "auth:blacklist:";

    private final StringRedisTemplate redisTemplate;

    public void blacklist(String jti, long ttlSeconds) {
        if (jti == null || jti.isBlank() || ttlSeconds <= 0) {
            return;
        }
        redisTemplate.opsForValue().set(
                KEY_PREFIX + jti,
                "1",
                Duration.ofSeconds(ttlSeconds)
        );
    }

    public boolean isBlacklisted(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + jti));
    }
}
