package com.ssafy.BE.domain.video.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "video_session")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "input_image_file_name", nullable = false, length = 255)
    private String inputImageFileName;

    @Column(name = "cross_section_file_name", length = 255)
    private String crossSectionFileName;

    @Column(name = "analysis_json", columnDefinition = "json")
    private String analysisJson;

    @Column(length = 50)
    private String focus;

    @Column(name = "simulation_id")
    private Integer simulationId;

    @Column(name = "background_id")
    private Integer backgroundId;

    @Column(columnDefinition = "TEXT")
    private String hint;

    @Column(name = "video_prompt_kr", columnDefinition = "TEXT")
    private String videoPromptKr;

    @Column(name = "selected_keyframe_id")
    private Integer selectedKeyframeId;

    @Column(name = "keyframe_attempts", nullable = false)
    private Integer keyframeAttempts;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoSessionStatus status;

    @Column(name = "video_id")
    private Integer videoId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Builder
    private VideoSession(Integer userId, String inputImageFileName,
                         String analysisJson, LocalDateTime expiresAt) {
        this.userId = userId;
        this.inputImageFileName = inputImageFileName;
        this.analysisJson = analysisJson;
        this.keyframeAttempts = 0;
        this.status = VideoSessionStatus.ANALYZED;
        this.expiresAt = expiresAt;
    }

    public void updateChoices(Integer simulationId, Integer backgroundId, String focus, String hint) {
        this.simulationId = simulationId;
        this.backgroundId = backgroundId;
        this.focus = focus;
        this.hint = hint;
        this.status = VideoSessionStatus.KEYFRAMING;
    }

    public void incrementKeyframeAttempts() {
        this.keyframeAttempts++;
    }

    public void selectKeyframe(Integer keyframeId) {
        this.selectedKeyframeId = keyframeId;
        this.status = VideoSessionStatus.READY_TO_GENERATE;
    }

    public void updateVideoPromptKr(String videoPromptKr) {
        this.videoPromptKr = videoPromptKr;
    }

    public void submit(Integer videoId) {
        this.videoId = videoId;
        this.status = VideoSessionStatus.SUBMITTED;
    }

    public void abandon() {
        this.status = VideoSessionStatus.ABANDONED;
    }
}
