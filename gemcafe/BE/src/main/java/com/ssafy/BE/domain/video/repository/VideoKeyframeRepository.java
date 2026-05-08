package com.ssafy.BE.domain.video.repository;

import com.ssafy.BE.domain.video.entity.VideoKeyframe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VideoKeyframeRepository extends JpaRepository<VideoKeyframe, Integer> {
    List<VideoKeyframe> findBySessionIdOrderByAttemptNumberAsc(Integer sessionId);
}
