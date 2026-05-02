package com.ssafy.BE.global.exception;

public record ErrorResponse(int status, String errorCode, String message) {

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(
                errorCode.getStatus().value(),
                errorCode.getCode(),
                errorCode.getMessage()
        );
    }

    public static ErrorResponse of(int status, String errorCode, String message) {
        return new ErrorResponse(status, errorCode, message);
    }
}
