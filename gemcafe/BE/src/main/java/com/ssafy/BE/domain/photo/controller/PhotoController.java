package com.ssafy.BE.domain.photo.controller;

import com.ssafy.BE.domain.photo.dto.PhotoUploadResponse;
import com.ssafy.BE.domain.photo.service.PhotoService;
import com.ssafy.BE.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/photos")
@RequiredArgsConstructor
public class PhotoController {

    private final PhotoService photoService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<PhotoUploadResponse> upload(
            @RequestParam("file") MultipartFile file
    ) {
        PhotoUploadResponse data = photoService.upload(file);
        return ApiResponse.ok("사진 업로드 성공", data);
    }
}
