package com.ssafy.BE.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Auth
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "AUTH-001", "아이디 또는 비밀번호가 올바르지 않습니다"),
    AUTH_MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "AUTH-002", "필수 파라미터가 누락되었습니다"),
    AUTH_INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH-003", "유효하지 않은 토큰입니다"),

    // User
    USER_EMAIL_DUPLICATED(HttpStatus.CONFLICT, "USER-001", "이미 가입된 이메일입니다"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER-002", "해당 사용자를 찾을 수 없습니다"),

    // Common
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "COM-001", "요청 형식이 올바르지 않습니다"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COM-500", "서버 오류가 발생했습니다");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
