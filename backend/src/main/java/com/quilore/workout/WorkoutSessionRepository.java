package com.quilore.workout;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSessionEntity, UUID> {
    List<WorkoutSessionEntity> findByUserIdOrderByStartedAtDesc(UUID userId);

    Optional<WorkoutSessionEntity> findByIdAndUserId(UUID id, UUID userId);
}
