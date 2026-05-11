package com.ssafy.BE.infra.oauth.google;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import com.ssafy.BE.infra.oauth.google.dto.GoogleProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.GeneralSecurityException;

/**
 * FE 가 보내준 Google ID Token (JWT) 을 검증하고 사용자 프로필을 반환한다.
 * 검증 항목 (GoogleIdTokenVerifier 가 자동 수행):
 *  - 서명 (구글 공개키)
 *  - aud == 우리 client_id
 *  - iss == accounts.google.com
 *  - exp 만료 시간
 * 추가로 이 서비스에서 검사:
 *  - email_verified == true (구글에서 이메일 미인증인 계정 차단)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleIdTokenService {

    private final GoogleIdTokenVerifier verifier;

    public GoogleProfile verify(String idTokenString) {
        if (idTokenString == null || idTokenString.isBlank()) {
            throw new BusinessException(ErrorCode.AUTH_GOOGLE_TOKEN_INVALID);
        }

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (GeneralSecurityException e) {
            log.error("[GOOGLE-OAUTH] verifier security error: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AUTH_GOOGLE_TOKEN_INVALID);
        } catch (java.io.IOException e) {
            log.error("[GOOGLE-OAUTH] verifier IO error (JWKS fetch?): {}", e.getMessage());
            throw new BusinessException(ErrorCode.AUTH_GOOGLE_UNREACHABLE);
        } catch (IllegalArgumentException e) {
            // 토큰 형식 자체가 깨졌을 때
            log.warn("[GOOGLE-OAUTH] malformed id token: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AUTH_GOOGLE_TOKEN_INVALID);
        }

        if (idToken == null) {
            // 서명/aud/iss/exp 중 하나라도 실패하면 null 반환
            throw new BusinessException(ErrorCode.AUTH_GOOGLE_TOKEN_INVALID);
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        Boolean emailVerified = payload.getEmailVerified();
        if (emailVerified == null || !emailVerified) {
            log.warn("[GOOGLE-OAUTH] email not verified: sub={}", payload.getSubject());
            throw new BusinessException(ErrorCode.AUTH_GOOGLE_EMAIL_NOT_VERIFIED);
        }

        return new GoogleProfile(
                payload.getSubject(),
                payload.getEmail(),
                true,
                (String) payload.get("name"),
                (String) payload.get("picture")
        );
    }
}
