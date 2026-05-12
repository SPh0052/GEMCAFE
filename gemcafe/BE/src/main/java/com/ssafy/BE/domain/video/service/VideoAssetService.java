package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.VideoDetailResponse;
import com.ssafy.BE.domain.video.dto.VideoDownloadResponse;
import com.ssafy.BE.domain.video.dto.VideoShareResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VideoAssetService {

    private static final String DEFAULT_TITLE = "내 케이크 영상";

    // 보호된 파일 서빙 컨트롤러 URL 패턴 (FileServingController 와 동기화 필요)
    private static final String VIDEO_FILE_URL_FMT = "/api/v1/files/videos/%d";
    private static final String THUMBNAIL_URL_FMT = "/api/v1/files/videos/%d/thumbnail";

    private final VideoRepository videoRepository;

    @Transactional(readOnly = true)
    public VideoDetailResponse getDetail(Integer userId, Integer videoId) {
        Video video = findCompletedOwnedBy(userId, videoId);
        String title = (video.getUserPrompt() == null || video.getUserPrompt().isBlank())
                ? DEFAULT_TITLE
                : video.getUserPrompt();
        return new VideoDetailResponse(
                video.getId(),
                title,
                video.getOriginFileName(),
                buildThumbnailUrl(video.getId()),
                buildVideoUrl(video.getId()),
                video.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public VideoDownloadResponse getDownload(Integer userId, Integer videoId) {
        Video video = findCompletedOwnedBy(userId, videoId);
        return new VideoDownloadResponse(
                video.getId(),
                buildVideoUrl(video.getId()),
                video.getOriginFileName(),
                video.getFileSize()
        );
    }

    @Transactional(readOnly = true)
    public VideoShareResponse getShare(Integer userId, Integer videoId) {
        Video video = findCompletedOwnedBy(userId, videoId);
        String title = (video.getUserPrompt() == null || video.getUserPrompt().isBlank())
                ? DEFAULT_TITLE
                : video.getUserPrompt();
        return new VideoShareResponse(
                video.getId(),
                buildVideoUrl(video.getId()),
                buildThumbnailUrl(video.getId()),
                title,
                video.getOriginFileName()
        );
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

    private String buildVideoUrl(Integer videoId) {
        return String.format(VIDEO_FILE_URL_FMT, videoId);
    }

    private String buildThumbnailUrl(Integer videoId) {
        return String.format(THUMBNAIL_URL_FMT, videoId);
    }
}
