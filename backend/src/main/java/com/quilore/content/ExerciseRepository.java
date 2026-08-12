package com.quilore.content;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<ExerciseEntity, UUID> {
    Optional<ExerciseEntity> findBySlug(String slug);
    List<ExerciseEntity> findByPublishedTrue();
}
