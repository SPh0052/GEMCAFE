package com.ssafy.BE.domain.auth.dto;

public record TokenPair(String accessToken, String refreshToken, long accessExpiresIn) {}
