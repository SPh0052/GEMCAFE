package com.ssafy.BE.domain.background.repository;

import com.ssafy.BE.domain.background.entity.Background;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BackgroundRepository extends JpaRepository<Background, Integer> {
}
