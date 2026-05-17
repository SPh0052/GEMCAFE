package com.ssafy.BE.domain.video.repository;

import com.ssafy.BE.domain.video.entity.VideoSession;
import com.ssafy.BE.domain.video.entity.VideoSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface VideoSessionRepository extends JpaRepository<VideoSession, Integer> {

    /**
     * 본인 user 의 진행 중 세션 목록. 영상 생성 단계 진입 전 + 만료되지 않은 것.
     */
    List<VideoSession> findByUserIdAndStatusInAndExpiresAtAfterOrderByCreatedAtDesc(
            Integer userId,
            Collection<VideoSessionStatus> statuses,
            LocalDateTime now
    );

    Optional<VideoSession> findByVideoId(Integer videoId);
}
