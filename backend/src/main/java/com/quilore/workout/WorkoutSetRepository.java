package com.quilore.workout;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkoutSetRepository extends JpaRepository<WorkoutSetEntity, UUID> {
    List<WorkoutSetEntity> findBySessionIdOrderBySetIndexAsc(UUID sessionId);
}
