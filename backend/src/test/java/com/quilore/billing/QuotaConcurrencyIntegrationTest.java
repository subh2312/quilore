package com.quilore.billing;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * F1: prove concurrent consumeQuota cannot push used_count past the plan limit.
 */
@SpringBootTest
class QuotaConcurrencyIntegrationTest {

    private static final int QUOTA_LIMIT = 5;
    private static final int CONCURRENT_ATTEMPTS = 40;

    @Autowired EntitlementService entitlementService;
    @Autowired UsageQuotaRepository usageQuotaRepository;
    @Autowired UsageCounterRepository usageCounterRepository;
    @Autowired PlanRepository planRepository;

    @Test
    void concurrentConsumesNeverExceedConfiguredQuota() throws Exception {
        UUID userId = UUID.randomUUID();
        entitlementService.assignPlan(userId, "PREMIUM");

        PlanEntity premium = planRepository.findByCodeIgnoreCase("PREMIUM").orElseThrow();
        UsageQuotaEntity mealScanQuota = usageQuotaRepository.findByPlanId(premium.getId()).stream()
                .filter(q -> "ai_meal_scan".equals(q.getFeatureKey()))
                .findFirst()
                .orElseThrow();
        mealScanQuota.setLimitCount(QUOTA_LIMIT);
        usageQuotaRepository.saveAndFlush(mealScanQuota);

        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_ATTEMPTS);
        CountDownLatch ready = new CountDownLatch(CONCURRENT_ATTEMPTS);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger exhausted = new AtomicInteger();
        List<Throwable> unexpected = Collections.synchronizedList(new ArrayList<>());

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < CONCURRENT_ATTEMPTS; i++) {
            futures.add(pool.submit(() -> {
                ready.countDown();
                try {
                    start.await(10, TimeUnit.SECONDS);
                    entitlementService.consumeQuota(userId, "ai_meal_scan");
                    successes.incrementAndGet();
                } catch (ResponseStatusException ex) {
                    if (ex.getStatusCode().value() == 429) {
                        exhausted.incrementAndGet();
                    } else {
                        unexpected.add(ex);
                    }
                } catch (Exception ex) {
                    unexpected.add(ex);
                }
            }));
        }

        assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
        start.countDown();
        for (Future<?> future : futures) {
            future.get(60, TimeUnit.SECONDS);
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        assertThat(unexpected)
                .withFailMessage("unexpected failures: %s", unexpected)
                .isEmpty();
        assertThat(successes.get())
                .withFailMessage("successes=%s exhausted=%s unexpected=%s",
                        successes.get(), exhausted.get(), unexpected)
                .isEqualTo(QUOTA_LIMIT);
        assertThat(exhausted.get()).isEqualTo(CONCURRENT_ATTEMPTS - QUOTA_LIMIT);

        LocalDate periodStart = LocalDate.now().withDayOfMonth(1);
        int stored = usageCounterRepository
                .findByUserIdAndFeatureKeyAndPeriodStart(userId, "ai_meal_scan", periodStart)
                .map(UsageCounterEntity::getUsedCount)
                .orElse(0);
        assertThat(stored).isEqualTo(QUOTA_LIMIT);
        assertThat(stored).isLessThanOrEqualTo(QUOTA_LIMIT);
    }
}
