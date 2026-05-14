package com.ssafy.BE.domain.video.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "video")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "simulation_code", length = 50)
    private String simulationCode;

    @Column(name = "background_code", length = 50)
    private String backgroundCode;

    @Column(name = "origin_file_name", nullable = false, length = 50)
    private String originFileName;

    @Column(name = "stored_file_name", nullable = false, length = 255)
    private String storedFileName;

    @Column(name = "file_type", nullable = false, length = 10)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private Integer fileSize;

    @Column(name = "thumbnail_file_name", nullable = false, length = 255)
    private String thumbnailFileName;

    @Column(name = "user_prompt", columnDefinition = "TEXT")
    private String userPrompt;

    @Column(nullable = false)
    private Integer gem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    private Video(Integer userId, String backgroundCode, String simulationCode,
                  String originFileName, String storedFileName,
                  String fileType, Integer fileSize, String thumbnailFileName,
                  String userPrompt, Integer gem, VideoStatus status) {
        this.userId = userId;
        this.backgroundCode = backgroundCode;
        this.simulationCode = simulationCode;
        this.originFileName = originFileName;
        this.storedFileName = storedFileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.thumbnailFileName = thumbnailFileName;
        this.userPrompt = userPrompt;
        this.gem = gem;
        this.status = status != null ? status : VideoStatus.GENERATING;
    }

    public void markCompleted(String storedFileName, Integer fileSize, String thumbnailFileName) {
        this.storedFileName = storedFileName;
        this.fileSize = fileSize;
        this.thumbnailFileName = thumbnailFileName;
        this.status = VideoStatus.COMPLETED;
    }

    public void markFailed() {
        this.status = VideoStatus.FAILED;
    }

    public void updateTitle(String title) {
        this.originFileName = title;
    }

    public void replaceFiles(String storedFileName, Integer fileSize, String thumbnailFileName) {
        this.storedFileName = storedFileName;
        this.fileSize = fileSize;
        this.thumbnailFileName = thumbnailFileName;
    }
}
