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

    // Photo upload
    PHOTO_INVALID_FORMAT(HttpStatus.BAD_REQUEST, "PHOTO-001", "지원하지 않는 파일 형식입니다 (jpg/jpeg/png만 허용)"),
    PHOTO_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "PHOTO-002", "파일 크기가 10MB를 초과합니다"),
    PHOTO_CORRUPTED(HttpStatus.BAD_REQUEST, "PHOTO-003", "파일이 비어있거나 손상되었습니다"),
    PHOTO_NOT_ATTACHED(HttpStatus.BAD_REQUEST, "PHOTO-004", "파일이 첨부되지 않았습니다"),
    PHOTO_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "PHOTO-005", "파일 업로드 중 오류가 발생했습니다"),

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
