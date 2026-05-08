package com.ssafy.BE.domain.video.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "video_keyframe")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoKeyframe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "session_id", nullable = false)
    private Integer sessionId;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    @Column(name = "keyframe_url", nullable = false, length = 500)
    private String keyframeUrl;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(name = "frame_strategy", nullable = false, length = 50)
    private String frameStrategy;

    @Column(name = "video_prompt", nullable = false, columnDefinition = "TEXT")
    private String videoPrompt;

    private Integer seed;

    @Column(columnDefinition = "json")
    private String metadata;

    @Column(name = "is_selected", nullable = false)
    private boolean selected;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    private VideoKeyframe(Integer sessionId, Integer attemptNumber,
                          String keyframeUrl, String baseUrl,
                          String frameStrategy, String videoPrompt,
                          Integer seed, String metadata) {
        this.sessionId = sessionId;
        this.attemptNumber = attemptNumber;
        this.keyframeUrl = keyframeUrl;
        this.baseUrl = baseUrl;
        this.frameStrategy = frameStrategy;
        this.videoPrompt = videoPrompt;
        this.seed = seed;
        this.metadata = metadata;
        this.selected = false;
    }

    public void markSelected() {
        this.selected = true;
    }

    public void unselect() {
        this.selected = false;
    }
}
