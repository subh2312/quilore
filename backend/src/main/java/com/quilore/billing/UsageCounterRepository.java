package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface UsageCounterRepository extends JpaRepository<UsageCounterEntity, UUID> {
    Optional<UsageCounterEntity> findByUserIdAndFeatureKeyAndPeriodStart(UUID userId, String featureKey, LocalDate periodStart);
}
