package com.quilore.content;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExerciseRevisionRepository extends JpaRepository<ExerciseRevisionEntity, UUID> {
    List<ExerciseRevisionEntity> findAllByOrderByCreatedAtAsc();
}
