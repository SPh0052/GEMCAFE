package com.ssafy.BE.domain.video.repository;

import com.ssafy.BE.domain.video.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoRepository extends JpaRepository<Video, Integer> {
}
