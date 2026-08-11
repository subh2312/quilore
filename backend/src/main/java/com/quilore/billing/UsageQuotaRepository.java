package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UsageQuotaRepository extends JpaRepository<UsageQuotaEntity, UUID> {
    List<UsageQuotaEntity> findByPlanId(UUID planId);
}
