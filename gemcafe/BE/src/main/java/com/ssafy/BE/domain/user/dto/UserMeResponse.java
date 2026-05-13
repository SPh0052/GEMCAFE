package com.ssafy.BE.domain.user.dto;

import com.ssafy.BE.domain.user.entity.Provider;
import com.ssafy.BE.domain.user.entity.User;

import java.time.LocalDateTime;

public record UserMeResponse(
        Integer userId,
        String email,
        String name,
        String profileImage,
        int gem,
        Provider provider,
        LocalDateTime createdAt
) {

    private static final String PROFILE_IMAGE_URL = "/api/v1/files/users/me/profile-image";

    public static UserMeResponse from(User user) {
        String profileImage = (user.getProfileUrl() == null || user.getProfileUrl().isBlank())
                ? null
                : PROFILE_IMAGE_URL;
        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                profileImage,
                user.getGem(),
                user.getProvider(),
                user.getCreatedAt()
        );
    }
}
