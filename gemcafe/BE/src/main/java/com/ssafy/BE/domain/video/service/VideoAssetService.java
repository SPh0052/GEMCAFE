package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.VideoDownloadResponse;
import com.ssafy.BE.domain.video.dto.VideoShareResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VideoAssetService {

    private static final String THUMBNAIL_SUBDIR = "thumbnails";
    private static final String DEFAULT_TITLE = "내 케이크 영상";

    private final VideoRepository videoRepository;

    @Value("${app.file.base-url}")
    private String fileBaseUrl;

    @Value("${app-video.subdir}")
    private String videoSubdir;

    @Transactional(readOnly = true)
    public VideoDownloadResponse getDownload(Integer userId, Integer videoId) {
        Video video = findCompletedOwnedBy(userId, videoId);
        String fileUrl = buildVideoUrl(video.getStoredFileName());
        return new VideoDownloadResponse(
                video.getId(),
                fileUrl,
                video.getOriginFileName(),
                video.getFileSize()
        );
    }

    @Transactional(readOnly = true)
    public VideoShareResponse getShare(Integer userId, Integer videoId) {
        Video video = findCompletedOwnedBy(userId, videoId);
        String videoUrl = buildVideoUrl(video.getStoredFileName());
        String thumbnailUrl = buildThumbnailUrl(video.getThumbnailFileName());
        String title = (video.getUserPrompt() == null || video.getUserPrompt().isBlank())
                ? DEFAULT_TITLE
                : video.getUserPrompt();
        return new VideoShareResponse(video.getId(), videoUrl, thumbnailUrl, title);
    }

    private Video findCompletedOwnedBy(Integer userId, Integer videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VIDEO_NOT_FOUND));
        if (userId == null || !video.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_RESOURCE);
        }
        if (video.getStatus() != VideoStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VIDEO_NOT_READY);
        }
        return video;
    }

    private String buildVideoUrl(String fileName) {
        return fileBaseUrl + "/" + videoSubdir + "/" + fileName;
    }

    private String buildThumbnailUrl(String fileName) {
        return fileBaseUrl + "/" + videoSubdir + "/" + THUMBNAIL_SUBDIR + "/" + fileName;
    }
}
