package com.ssafy.BE.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Auth
    AUTH_INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "AUTH-001", "아이디 또는 비밀번호가 올바르지 않습니다"),
    AUTH_MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "AUTH-002", "필수 파라미터가 누락되었습니다"),
    AUTH_INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH-003", "유효하지 않은 토큰입니다"),
    FORBIDDEN_RESOURCE(HttpStatus.FORBIDDEN, "AUTH-004", "해당 리소스에 접근할 권한이 없습니다"),

    // Auth - Google OAuth
    AUTH_GOOGLE_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "AUTH-010", "유효하지 않은 구글 토큰입니다"),
    AUTH_GOOGLE_EMAIL_NOT_VERIFIED(HttpStatus.UNAUTHORIZED, "AUTH-011", "이메일 인증이 완료되지 않은 구글 계정입니다"),
    AUTH_GOOGLE_UNREACHABLE(HttpStatus.SERVICE_UNAVAILABLE, "AUTH-012", "구글 인증 서버에 연결할 수 없습니다"),
    AUTH_EMAIL_PROVIDER_CONFLICT(HttpStatus.CONFLICT, "AUTH-013", "이미 일반 가입된 이메일입니다. 이메일/비밀번호로 로그인해주세요"),
    AUTH_PROFILE_ALREADY_COMPLETED(HttpStatus.BAD_REQUEST, "AUTH-014", "이미 추가 정보 입력이 완료된 계정입니다"),

    // User
    USER_EMAIL_DUPLICATED(HttpStatus.CONFLICT, "USER-001", "이미 가입된 이메일입니다"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER-002", "해당 사용자를 찾을 수 없습니다"),

    // Image upload
    IMAGE_INVALID_FORMAT(HttpStatus.BAD_REQUEST, "IMAGE-001", "지원하지 않는 파일 형식입니다 (jpg/jpeg/png만 허용)"),
    IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "IMAGE-002", "파일 크기가 10MB를 초과합니다"),
    IMAGE_CORRUPTED(HttpStatus.BAD_REQUEST, "IMAGE-003", "파일이 비어있거나 손상되었습니다"),
    IMAGE_NOT_ATTACHED(HttpStatus.BAD_REQUEST, "IMAGE-004", "파일이 첨부되지 않았습니다"),
    IMAGE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "IMAGE-005", "파일 업로드 중 오류가 발생했습니다"),

    // AI
    AI_VIDEO_UNREACHABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI-001", "AI 영상 생성 서비스에 연결할 수 없습니다"),
    AI_VIDEO_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI-002", "AI 영상 생성에 실패했습니다"),
    AI_ANALYZE_UNREACHABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI-003", "AI 분석 서비스에 연결할 수 없습니다"),
    AI_ANALYZE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI-004", "AI 케이크 이미지 분석에 실패했습니다"),
    AI_RESPONSE_PARSE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI-005", "AI 응답 파싱에 실패했습니다"),
    AI_KEYFRAME_UNREACHABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI-006", "AI 키프레임 서비스에 연결할 수 없습니다"),
    AI_KEYFRAME_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI-007", "AI 키프레임 생성에 실패했습니다"),

    // Session
    SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "SESSION-001", "해당 세션을 찾을 수 없습니다"),
    SESSION_EXPIRED(HttpStatus.BAD_REQUEST, "SESSION-002", "세션이 만료되었습니다"),
    SESSION_INVALID_STATE(HttpStatus.BAD_REQUEST, "SESSION-003", "현재 세션 상태에서 수행할 수 없는 작업입니다"),
    KEYFRAME_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "SESSION-004", "키프레임 재생성 한도를 초과했습니다"),
    KEYFRAME_NOT_FOUND(HttpStatus.NOT_FOUND, "SESSION-005", "해당 키프레임을 찾을 수 없습니다"),
    KEYFRAME_SESSION_MISMATCH(HttpStatus.BAD_REQUEST, "SESSION-006", "키프레임이 해당 세션에 속하지 않습니다"),
    SIMULATION_NOT_FOUND(HttpStatus.NOT_FOUND, "SIM-001", "해당 시뮬레이션을 찾을 수 없습니다"),
    BACKGROUND_NOT_FOUND(HttpStatus.NOT_FOUND, "BG-001", "해당 배경을 찾을 수 없습니다"),
    KEYFRAME_NOT_SELECTED(HttpStatus.BAD_REQUEST, "SESSION-007", "선택된 키프레임이 없습니다"),

    // Gem
    GEM_INSUFFICIENT(HttpStatus.BAD_REQUEST, "GEM-001", "젬이 부족합니다"),

    // Video
    VIDEO_NOT_FOUND(HttpStatus.NOT_FOUND, "VIDEO-001", "해당 영상을 찾을 수 없습니다"),
    VIDEO_FILE_PROCESSING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "VIDEO-002", "영상 파일 처리 중 오류가 발생했습니다"),
    VIDEO_NOT_READY(HttpStatus.BAD_REQUEST, "VIDEO-003", "영상이 아직 준비되지 않았습니다"),

    // Watermark / Job
    WATERMARK_SOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "WM-001", "워터마크 처리할 원본 영상 파일을 찾을 수 없습니다"),
    WATERMARK_JOB_NOT_FOUND(HttpStatus.NOT_FOUND, "WM-002", "해당 작업을 찾을 수 없거나 만료되었습니다"),
    WATERMARK_JOB_PUBLISH_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "WM-003", "워터마크 작업 요청 발행에 실패했습니다"),
    WATERMARK_PROGRESS_PARSE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "WM-004", "진행 상태 메시지 파싱에 실패했습니다"),
    WATERMARK_EMBED_UNREACHABLE(HttpStatus.SERVICE_UNAVAILABLE, "WM-005", "gemmark 워터마크 서비스에 연결할 수 없습니다"),
    WATERMARK_EMBED_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "WM-006", "워터마크 삽입에 실패했습니다"),

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
