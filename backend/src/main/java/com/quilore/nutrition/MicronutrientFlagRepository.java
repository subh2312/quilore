package com.quilore.nutrition;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MicronutrientFlagRepository extends JpaRepository<MicronutrientFlagEntity, UUID> {
    List<MicronutrientFlagEntity> findByUserIdAndDismissedFalseOrderByCreatedAtDesc(UUID userId);
    Optional<MicronutrientFlagEntity> findByIdAndUserId(UUID id, UUID userId);
}
