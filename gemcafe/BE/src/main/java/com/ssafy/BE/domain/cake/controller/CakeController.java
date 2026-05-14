package com.ssafy.BE.domain.cake.controller;

import com.ssafy.BE.domain.cake.dto.CakeAnalyzeResponse;
import com.ssafy.BE.domain.cake.dto.KeyframeGenerateRequest;
import com.ssafy.BE.domain.cake.dto.KeyframeGenerateResponse;
import com.ssafy.BE.domain.cake.dto.KeyframeSelectRequest;
import com.ssafy.BE.domain.cake.dto.KeyframeSelectResponse;
import com.ssafy.BE.domain.cake.dto.PreviewPromptRequest;
import com.ssafy.BE.domain.cake.dto.PreviewPromptResponse;
import com.ssafy.BE.domain.cake.dto.SessionDetailResponse;
import com.ssafy.BE.domain.cake.dto.SessionListResponse;
import com.ssafy.BE.domain.cake.service.CakeAnalyzeService;
import com.ssafy.BE.domain.cake.service.CakeKeyframeService;
import com.ssafy.BE.domain.cake.service.CakePreviewPromptService;
import com.ssafy.BE.domain.cake.service.CakeSessionQueryService;
import com.ssafy.BE.global.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Cake", description = "케이크 영상 생성 파이프라인 (analyze / keyframe / video)")
@RestController
@RequestMapping("/api/v1/cakes")
@RequiredArgsConstructor
public class CakeController {

    private final CakeAnalyzeService cakeAnalyzeService;
    private final CakeKeyframeService cakeKeyframeService;
    private final CakePreviewPromptService cakePreviewPromptService;
    private final CakeSessionQueryService cakeSessionQueryService;

    @Operation(summary = "케이크 이미지 분석 (Step 2). video_session 생성 후 분석 결과 반환")
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CakeAnalyzeResponse> analyze(
            @AuthenticationPrincipal Integer userId,
            @RequestParam("image") MultipartFile image
    ) {
        CakeAnalyzeResponse data = cakeAnalyzeService.analyze(userId, image);
        return ApiResponse.ok("이미지 분석 완료", data);
    }

    @Operation(summary = "자동 프롬프트 생성 (Step 4). 사용자 선택값으로 LLM이 한국어 영상 묘사 생성. stateless.")
    @PostMapping("/sessions/{sessionId}/preview-prompts")
    public ApiResponse<PreviewPromptResponse> previewPrompts(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer sessionId,
            @Valid @RequestBody PreviewPromptRequest request
    ) {
        PreviewPromptResponse data = cakePreviewPromptService.generate(userId, sessionId, request);
        return ApiResponse.ok("자동 프롬프트 생성 완료", data);
    }

    @Operation(summary = "키프레임 생성 (Step 7). 재생성 시 동일 엔드포인트 재호출. 최대 3회.")
    @PostMapping("/sessions/{sessionId}/keyframes")
    public ApiResponse<KeyframeGenerateResponse> generateKeyframe(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer sessionId,
            @Valid @RequestBody KeyframeGenerateRequest request
    ) {
        KeyframeGenerateResponse data = cakeKeyframeService.generate(userId, sessionId, request);
        return ApiResponse.ok("키프레임 생성 완료", data);
    }

    @Operation(summary = "진행 중 세션 목록 조회. 영상 생성 진입 전(ANALYZED/KEYFRAMING/READY_TO_GENERATE) 세션만. 카드 리스트용.")
    @GetMapping("/sessions/in-progress")
    public ApiResponse<SessionListResponse> listInProgressSessions(
            @AuthenticationPrincipal Integer userId
    ) {
        SessionListResponse data = cakeSessionQueryService.listInProgress(userId);
        return ApiResponse.ok("진행 중 세션 목록 조회 완료", data);
    }

    @Operation(summary = "세션 상세 조회. video_session 의 모든 컬럼 + 키프레임 후보 전체. null 컬럼은 null 로 그대로 반환.")
    @GetMapping("/sessions/{sessionId}")
    public ApiResponse<SessionDetailResponse> getSessionDetail(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer sessionId
    ) {
        SessionDetailResponse data = cakeSessionQueryService.getDetail(userId, sessionId);
        return ApiResponse.ok("세션 상세 조회 완료", data);
    }

    @Operation(summary = "키프레임 선택 (Step 7-③). 영상 생성 단계로 진입할 키프레임 확정")
    @PostMapping("/sessions/{sessionId}/select-keyframe")
    public ApiResponse<KeyframeSelectResponse> selectKeyframe(
            @AuthenticationPrincipal Integer userId,
            @PathVariable Integer sessionId,
            @Valid @RequestBody KeyframeSelectRequest request
    ) {
        KeyframeSelectResponse data = cakeKeyframeService.select(userId, sessionId, request);
        return ApiResponse.ok("키프레임 선택 완료", data);
    }
}
