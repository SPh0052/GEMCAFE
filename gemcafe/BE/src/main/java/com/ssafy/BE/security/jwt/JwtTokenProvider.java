package com.ssafy.BE.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-expire-minutes}")
    private long accessExpireMinutes;

    @Value("${jwt.refresh-expire-days}")
    @Getter
    private long refreshExpireDays;

    private SecretKey key;

    @PostConstruct
    void init() {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(Integer userId) {
        return buildToken(userId, TYPE_ACCESS, Duration.ofMinutes(accessExpireMinutes));
    }

    public String createRefreshToken(Integer userId) {
        return buildToken(userId, TYPE_REFRESH, Duration.ofDays(refreshExpireDays));
    }

    public long accessExpireSeconds() {
        return accessExpireMinutes * 60;
    }

    public Duration refreshExpireDuration() {
        return Duration.ofDays(refreshExpireDays);
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String buildToken(Integer userId, String type, Duration ttl) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + ttl.toMillis());
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, type)
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)
                .compact();
    }
}
