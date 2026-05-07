package com.ssafy.BE.domain.image.controller;

import com.ssafy.BE.domain.image.dto.ImageUploadResponse;
import com.ssafy.BE.domain.image.service.ImageService;
import com.ssafy.BE.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ImageUploadResponse> upload(
            @RequestParam("file") MultipartFile file
    ) {
        ImageUploadResponse data = imageService.upload(file);
        return ApiResponse.ok("이미지 업로드 성공", data);
    }
}
