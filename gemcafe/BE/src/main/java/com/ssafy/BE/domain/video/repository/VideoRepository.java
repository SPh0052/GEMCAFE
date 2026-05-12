package com.ssafy.BE.domain.video.repository;

import com.ssafy.BE.domain.video.entity.Video;
import com.ssafy.BE.domain.video.entity.VideoStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VideoRepository extends JpaRepository<Video, Integer> {

    List<Video> findByUserIdAndStatusAndDeletedAtIsNullOrderByIdDesc(
            Integer userId, VideoStatus status, Pageable pageable
    );

    List<Video> findByUserIdAndStatusAndDeletedAtIsNullAndIdLessThanOrderByIdDesc(
            Integer userId, VideoStatus status, Integer cursor, Pageable pageable
    );
}
