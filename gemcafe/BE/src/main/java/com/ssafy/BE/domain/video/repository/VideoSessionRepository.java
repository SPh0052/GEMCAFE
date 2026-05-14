package com.ssafy.BE.domain.video.repository;

import com.ssafy.BE.domain.video.entity.VideoSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoSessionRepository extends JpaRepository<VideoSession, Integer> {
}
