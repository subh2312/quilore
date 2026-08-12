package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlanRepository extends JpaRepository<PlanEntity, UUID> {
    Optional<PlanEntity> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
}
