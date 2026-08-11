package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlanEntitlementRepository extends JpaRepository<PlanEntitlementEntity, UUID> {
    List<PlanEntitlementEntity> findByPlanId(UUID planId);
}
