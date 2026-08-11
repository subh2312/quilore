package com.quilore.nutrition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MacroTargetSnapshotRepository extends JpaRepository<MacroTargetSnapshotEntity, UUID> {
    List<MacroTargetSnapshotEntity> findByUserIdOrderByEffectiveFromAsc(UUID userId);
}
