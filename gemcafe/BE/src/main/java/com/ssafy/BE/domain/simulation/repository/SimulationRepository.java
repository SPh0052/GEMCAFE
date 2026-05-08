package com.ssafy.BE.domain.simulation.repository;

import com.ssafy.BE.domain.simulation.entity.Simulation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRepository extends JpaRepository<Simulation, Integer> {
}
