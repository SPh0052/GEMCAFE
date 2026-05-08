package com.ssafy.BE.domain.cake.controller;

import com.ssafy.BE.domain.cake.dto.CakeAnalyzeResponse;
import com.ssafy.BE.domain.cake.service.CakeAnalyzeService;
import com.ssafy.BE.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Cake", description = "케이크 영상 생성 파이프라인 (analyze / keyframe / video)")
@RestController
@RequestMapping("/api/v1/cakes")
@RequiredArgsConstructor
public class CakeController {

    private final CakeAnalyzeService cakeAnalyzeService;

    @Operation(summary = "케이크 이미지 분석 (Step 2). video_session 생성 후 분석 결과 반환")
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CakeAnalyzeResponse> analyze(
            @RequestParam("image") MultipartFile image
    ) {
        // TODO: 인증 적용 후 SecurityContext 에서 userId 꺼내기
        Integer userId = 1;
        CakeAnalyzeResponse data = cakeAnalyzeService.analyze(userId, image);
        return ApiResponse.ok("이미지 분석 완료", data);
    }
}
