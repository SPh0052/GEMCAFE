package com.ssafy.BE.domain.video.service;

import com.ssafy.BE.domain.video.dto.UpdateVideoResponse;
import com.ssafy.BE.domain.video.dto.VideoDetailResponse;
import com.ssafy.BE.domain.video.dto.VideoDownloadResponse;
import com.ssafy.BE.domain.video.dto.VideoListItemResponse;
import com.ssafy.BE.domain.video.dto.VideoListResponse;
import com.ssafy.BE.domain.video.dto.VideoShareResponse;
import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import com.ssafy.BE.domain.video.repository.VideoRepository;
import com.ssafy.BE.global.exception.BusinessException;
import com.ssafy.BE.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoAssetService {

    private static final String DEFAULT_TITLE = "내 케이크 영상";

    // 보호된 파일 서빙 컨트롤러 URL 패턴 (FileServingController 와 동기화 필요)
    private static final String VIDEO_FILE_URL_FMT = "/api/v1/files/videos/%d";
    private static final String THUMBNAIL_URL_FMT = "/api/v1/files/videos/%d/thumbnail";

    private final VideoRepository videoRepository;
    private final VideoFileService videoFileService;

    @Transactional(readOnly = true)
    public VideoListResponse getList(Integer userId, Integer cursor, Integer size) {
        int pageSize = Math.max(1, Math.min(size == null ? 10 : size, 50));
        Pageable pageable = PageRequest.of(0, pageSize + 1);

        List<Video> rows = (cursor == null)
                ? videoRepository.findByUserIdAndStatusAndDeletedAtIsNullOrderByIdDesc(
                        userId, VideoStatus.COMPLETED, pageable)
                : videoRepository.findByUserIdAndStatusAndDeletedAtIsNullAndIdLessThanOrderByIdDesc(
                        userId, VideoStatus.COMPLETED, cursor, pageable);

        boolean hasNext = rows.size() > pageSize;
        List<Video> page = hasNext ? rows.subList(0, pageSize) : rows;

        List<VideoListItemResponse> items = page.stream()
                .map(v -> new VideoListItemResponse(
                        v.getId(),
                        resolveTitle(v),
                        buildThumbnailUrl(v.getId()),
                        v.getCreatedAt()))
                .toList();

        Integer nextCursor = hasNext ? page.get(page.size() - 1).getId() : null;
        return new VideoListResponse(items, nextCursor, hasNext);
    }

    @Transactional(readOnly = true)
    public VideoDetailResponse getDetail(Integer userId, Integer videoId) {
        Video video = findCompletedOwnedBy(userId, videoId);
        return new VideoDetailResponse(
                video.getId(),
                resolveTitle(video),
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
        return new VideoShareResponse(
                video.getId(),
                buildVideoUrl(video.getId()),
                buildThumbnailUrl(video.getId()),
                resolveTitle(video),
                video.getOriginFileName()
        );
    }

    @Transactional
    public UpdateVideoResponse update(
            Integer userId,
            Integer videoId,
            String title,
            MultipartFile videoFile,
            MultipartFile thumbnail
    ) {
        Video video = findCompletedOwnedBy(userId, videoId);

        boolean hasVideo = videoFile != null && !videoFile.isEmpty();
        boolean hasThumb = thumbnail != null && !thumbnail.isEmpty();
        if (hasVideo ^ hasThumb) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST);
        }

        String oldStored = video.getStoredFileName();
        String oldThumb = video.getThumbnailFileName();

        if (hasVideo) {
            VideoFileService.StoredVideo saved = videoFileService.saveUploadedFiles(videoFile, thumbnail);
            video.replaceFiles(saved.storedFileName(), (int) saved.fileSize(), saved.thumbnailFileName());
        }
        video.updateTitle(title);

        if (hasVideo) {
            try {
                videoFileService.deleteFiles(oldStored, oldThumb);
            } catch (Exception e) {
                log.warn("[VIDEO] old file cleanup failed videoId={} ({})", videoId, e.getMessage());
            }
        }

        return new UpdateVideoResponse(
                video.getId(),
                title,
                buildThumbnailUrl(video.getId()),
                buildVideoUrl(video.getId()),
                LocalDateTime.now()
        );
    }

    private String resolveTitle(Video video) {
        String name = video.getOriginFileName();
        return (name == null || name.isBlank()) ? DEFAULT_TITLE : name;
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
