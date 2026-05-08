package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class VideoFileService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Value("${app-video.subdir}")
    private String videoSubdir;

    @Value("${app-video.ffmpeg-path}")
    private String ffmpegPath;

    public record StoredVideo(String storedFileName, long fileSize, String thumbnailFileName) {}

    private static final String THUMBNAIL_SUBDIR = "thumbnails";

    public StoredVideo downloadAndThumbnail(String videoUrl) {
        String uuid = UUID.randomUUID().toString();
        String storedFileName = uuid + ".mp4";
        String thumbnailFileName = uuid + "_thumb.jpg";

        Path videoDir = Path.of(uploadDir, videoSubdir);
        Path thumbDir = videoDir.resolve(THUMBNAIL_SUBDIR);
        Path videoPath = videoDir.resolve(storedFileName);
        Path thumbPath = thumbDir.resolve(thumbnailFileName);

        try {
            Files.createDirectories(videoDir);
            Files.createDirectories(thumbDir);
            long size = downloadToDisk(videoUrl, videoPath);
            extractThumbnail(videoPath, thumbPath);
            return new StoredVideo(storedFileName, size, thumbnailFileName);
        } catch (IOException e) {
            log.error("[VIDEO-FILE] download/thumbnail failed: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.VIDEO_FILE_PROCESSING_FAILED);
        }
    }

    private long downloadToDisk(String url, Path target) throws IOException {
        log.info("[VIDEO-FILE] downloading {} -> {}", url, target);
        try (InputStream in = URI.create(url).toURL().openStream()) {
            return Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void extractThumbnail(Path videoPath, Path thumbPath) throws IOException {
        log.info("[VIDEO-FILE] extracting thumbnail -> {}", thumbPath);
        ProcessBuilder pb = new ProcessBuilder(
                ffmpegPath,
                "-y",
                "-i", videoPath.toString(),
                "-ss", "1",
                "-vframes", "1",
                "-q:v", "2",
                thumbPath.toString()
        );
        pb.redirectErrorStream(true);

        Process process = pb.start();
        try (InputStream in = process.getInputStream()) {
            in.readAllBytes();
        }

        try {
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IOException("ffmpeg timeout");
            }
            if (process.exitValue() != 0) {
                throw new IOException("ffmpeg exit=" + process.exitValue());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("ffmpeg interrupted", e);
        }
    }
}
