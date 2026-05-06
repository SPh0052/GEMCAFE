package com.ssafy.BE.domain.photo.service;

import com.ssafy.BE.domain.photo.dto.PhotoUploadResponse;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhotoService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png");
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of("image/jpeg", "image/png");

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Value("${app.file.base-url}")
    private String fileBaseUrl;

    public PhotoUploadResponse upload(MultipartFile file) {
        validateAttached(file);
        validateSize(file);
        String ext = validateAndExtractExtension(file);

        String storedFileName = UUID.randomUUID() + "." + ext;
        Path target = saveToDisk(file, storedFileName);

        String fileUrl = fileBaseUrl + "/" + storedFileName;
        String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        return new PhotoUploadResponse(
                storedFileName,
                file.getOriginalFilename(),
                ext,
                file.getSize(),
                mimeType,
                fileUrl,
                LocalDateTime.now()
        );
    }

    private void validateAttached(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            // size==0이면 손상으로, null/미첨부면 미첨부로 분류
            if (file == null || file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()) {
                throw new BusinessException(ErrorCode.PHOTO_NOT_ATTACHED);
            }
            throw new BusinessException(ErrorCode.PHOTO_CORRUPTED);
        }
    }

    private void validateSize(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ErrorCode.PHOTO_SIZE_EXCEEDED);
        }
    }

    private String validateAndExtractExtension(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BusinessException(ErrorCode.PHOTO_INVALID_FORMAT);
        }
        String ext = extractExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BusinessException(ErrorCode.PHOTO_INVALID_FORMAT);
        }
        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException(ErrorCode.PHOTO_INVALID_FORMAT);
        }
        return ext;
    }

    private Path saveToDisk(MultipartFile file, String storedFileName) {
        Path uploadPath = Path.of(uploadDir);
        Path target = uploadPath.resolve(storedFileName);
        try {
            Files.createDirectories(uploadPath);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.PHOTO_UPLOAD_FAILED);
        }
        return target;
    }

    private String extractExtension(String fileName) {
        int idx = fileName.lastIndexOf('.');
        return idx >= 0 ? fileName.substring(idx + 1) : "";
    }
}
