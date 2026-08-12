package com.quilore.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface UsageCounterRepository extends JpaRepository<UsageCounterEntity, UUID> {
    Optional<UsageCounterEntity> findByUserIdAndFeatureKeyAndPeriodStart(
            UUID userId, String featureKey, LocalDate periodStart);

    /**
     * Atomically increments usage when under the plan limit.
     * Returns 1 if a unit was consumed, 0 if the quota is exhausted (or row missing).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update UsageCounterEntity c
               set c.usedCount = c.usedCount + 1
             where c.userId = :userId
               and c.featureKey = :featureKey
               and c.periodStart = :periodStart
               and c.usedCount < :limit
            """)
    int tryIncrementIfUnderLimit(
            @Param("userId") UUID userId,
            @Param("featureKey") String featureKey,
            @Param("periodStart") LocalDate periodStart,
            @Param("limit") int limit
    );
}
