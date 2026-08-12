package com.quilore;

import com.quilore.billing.EntitlementService;
import com.quilore.media.MinioMediaService;
import com.quilore.notify.AsyncJobNotificationService;
import com.quilore.profile.ProfileMetricsService;
import com.quilore.sync.SyncService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * B3 persistence evidence: write domain rows, clear the persistence context, and reload.
 * Same Spring context is an acceptable "restart" simulation for H2 create-drop tests
 * (Flyway off); proves state is durable in the shared DB rather than ConcurrentHashMap.
 */
@SpringBootTest
class PersistenceRestartIntegrationTest {

    @Autowired ProfileMetricsService profileMetricsService;
    @Autowired EntitlementService entitlementService;
    @Autowired SyncService syncService;
    @Autowired AsyncJobNotificationService asyncJobNotificationService;
    @Autowired MinioMediaService minioMediaService;
    @Autowired EntityManager entityManager;
    @Autowired TransactionTemplate transactionTemplate;

    @Test
    void domainStateSurvivesPersistenceContextClearAndReload() {
        UUID userId = UUID.randomUUID();

        profileMetricsService.upsertProfile(userId, Map.of(
                "age", 29, "sex", "male", "heightCm", 178, "weightKg", 75
        ));
        entitlementService.assignPlan(userId, "PREMIUM");
        Map<String, Object> consumed = entitlementService.consumeQuota(userId, "ai_meal_scan");
        assertThat(consumed.get("used")).isEqualTo(1);

        syncService.push(userId, List.of(Map.of(
                "mutationId", "persist-m1-" + userId,
                "collection", "meal_entry",
                "id", "meal-persist-1",
                "updatedAtEpochMs", 42,
                "deleted", false,
                "data", Map.of("notes", "persisted")
        )));

        var job = asyncJobNotificationService.enqueue(userId, "meal_scan", "/nutrition/results/p");
        asyncJobNotificationService.complete(job.id(), "result://persist");

        Map<String, Object> media = minioMediaService.registerObject(
                userId, "users/" + userId + "/shot.bin", "application/octet-stream",
                "bytes".getBytes(StandardCharsets.UTF_8)
        );
        assertThat(media.get("status")).isEqualTo("deferred");
        assertThat(media.get("uploadAvailable")).isEqualTo(false);
        assertThat(media.get("url")).isNull();
        UUID mediaId = UUID.fromString(String.valueOf(media.get("id")));

        // Simulate process restart within the same Spring context: flush + clear L1 cache, then reload.
        transactionTemplate.executeWithoutResult(status -> {
            entityManager.flush();
            entityManager.clear();
        });

        assertThat(profileMetricsService.getProfile(userId).weightKg()).isEqualTo(75.0);
        assertThat(entitlementService.entitlementState(userId).get("plan")).isEqualTo("PREMIUM");
        @SuppressWarnings("unchecked")
        Map<String, Object> quota = (Map<String, Object>) ((Map<String, Object>) entitlementService
                .entitlementState(userId).get("quotas")).get("ai_meal_scan");
        assertThat(quota.get("used")).isEqualTo(1);

        assertThat(syncService.lastSync(userId)).isNotNull();
        Map<String, Object> pull = syncService.pull(userId, 0);
        @SuppressWarnings("unchecked")
        Map<String, Object> changes = (Map<String, Object>) pull.get("changes");
        assertThat((List<?>) changes.get("created")).isNotEmpty();

        assertThat(asyncJobNotificationService.get(job.id()).status().name()).isEqualTo("COMPLETED");
        assertThat(asyncJobNotificationService.forUser(userId)).isNotEmpty();

        Map<String, Object> reloadedMedia = minioMediaService.getMetadata(mediaId);
        assertThat(reloadedMedia.get("status")).isEqualTo("deferred");
        assertThat(reloadedMedia.get("uploadAvailable")).isEqualTo(false);
        assertThat(reloadedMedia.get("url")).isNull();
        assertThat(reloadedMedia.get("objectKey")).isEqualTo("users/" + userId + "/shot.bin");
        assertThat(reloadedMedia.get("checksumSha256")).isEqualTo(media.get("checksumSha256"));
    }
}
