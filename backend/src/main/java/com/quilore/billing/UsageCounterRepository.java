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
     * Creates the period counter when missing without raising a unique-constraint error
     * (safe under concurrency in the same transaction).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            insert into "usage_counters" ("id", "user_id", "feature_key", "period_start", "used_count")
            select :id, :userId, :featureKey, :periodStart, 0
            where not exists (
                select 1 from "usage_counters" uc
                where uc."user_id" = :userId
                  and uc."feature_key" = :featureKey
                  and uc."period_start" = :periodStart
            )
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("featureKey") String featureKey,
            @Param("periodStart") LocalDate periodStart
    );

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
