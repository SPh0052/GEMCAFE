package com.ssafy.BE.domain.user.controller;

import com.ssafy.BE.domain.user.dto.UserMeResponse;
import com.ssafy.BE.domain.user.service.UserService;
import com.ssafy.BE.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "User", description = "회원 정보")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public ApiResponse<UserMeResponse> getMe(@AuthenticationPrincipal Integer userId) {
        UserMeResponse data = userService.getMe(userId);
        return ApiResponse.ok("내 정보 조회 성공", data);
    }
}
