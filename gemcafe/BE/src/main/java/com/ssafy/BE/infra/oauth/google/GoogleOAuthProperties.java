package com.ssafy.BE.infra.oauth.google;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Google OAuth 관련 설정.
 * - clientId: 구글 콘솔에서 발급받은 OAuth 2.0 Client ID. FE 의 VITE_GOOGLE_CLIENT_ID 와 동일해야 함.
 * - signupBonusGem: 구글로 첫 가입 시 지급할 보너스 젬.
 */
@ConfigurationProperties(prefix = "oauth.google")
public record GoogleOAuthProperties(
        String clientId,
        Integer signupBonusGem
) {
    public GoogleOAuthProperties {
        if (signupBonusGem == null) {
            signupBonusGem = 20;
        }
    }
}
