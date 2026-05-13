package com.ssafy.BE.domain.user.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Slf4j
@Service
public class ProfileImageService {

    public static final String DEFAULT_PROFILE_FILE = "default-profile.jpg";
    private static final String PROFILE_SUBDIR = "profile-images";
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS = 10_000;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    /**
     * 구글 picture URL 을 EC2 디스크로 다운로드하고 저장된 파일명을 반환.
     * 입력이 null/빈값이거나 다운로드 실패 시 기본 프로필 파일명을 반환.
     */
    public String saveFromGoogleOrDefault(String pictureUrl) {
        if (pictureUrl == null || pictureUrl.isBlank()) {
            return DEFAULT_PROFILE_FILE;
        }
        try {
            String fileName = "google-" + UUID.randomUUID() + ".jpg";
            Path dir = Path.of(uploadDir, PROFILE_SUBDIR);
            Files.createDirectories(dir);
            Path target = dir.resolve(fileName);

            URLConnection conn = URI.create(pictureUrl).toURL().openConnection();
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            try (InputStream in = conn.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("[PROFILE-IMAGE] google picture downloaded file={}", fileName);
            return fileName;
        } catch (IOException e) {
            log.warn("[PROFILE-IMAGE] google picture download failed url={} err={} — fallback to default",
                    pictureUrl, e.getMessage());
            return DEFAULT_PROFILE_FILE;
        }
    }
}
