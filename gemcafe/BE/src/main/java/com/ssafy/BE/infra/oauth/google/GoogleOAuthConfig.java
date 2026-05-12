package com.ssafy.BE.infra.oauth.google;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Google ID Token 검증기 빈 등록.
 * GoogleIdTokenVerifier 가 내부적으로 구글 공개키(JWKS)를 캐싱하고 자동 갱신해주므로
 * 매 로그인마다 외부 호출이 발생하지 않는다 (캐시 만료 시점에만 1회).
 */
@Configuration
@EnableConfigurationProperties(GoogleOAuthProperties.class)
public class GoogleOAuthConfig {

    @Bean
    public GoogleIdTokenVerifier googleIdTokenVerifier(GoogleOAuthProperties props) {
        return new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                // aud (audience) 검증 — 우리 client_id 로 발급된 토큰만 통과
                .setAudience(List.of(props.clientId()))
                // iss (issuer) 검증 — accounts.google.com / https://accounts.google.com 만 허용
                .setIssuers(List.of("accounts.google.com", "https://accounts.google.com"))
                .build();
    }
}
