package com.quilore.sync;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class SyncServiceTest {

    @Autowired SyncService syncService;

    @Test
    void pushIsIdempotentAndUsesLastWriteWins() {
        UUID userId = UUID.randomUUID();
        Map<String, Object> first = Map.of(
                "mutationId", "m1",
                "collection", "meal_entry",
                "id", "meal-1",
                "updatedAtEpochMs", 1000,
                "deleted", false,
                "data", Map.of("notes", "v1")
        );
        Map<String, Object> duplicate = Map.of(
                "mutationId", "m1",
                "collection", "meal_entry",
                "id", "meal-1",
                "updatedAtEpochMs", 1000,
                "deleted", false,
                "data", Map.of("notes", "v1")
        );
        Map<String, Object> older = Map.of(
                "mutationId", "m2",
                "collection", "meal_entry",
                "id", "meal-1",
                "updatedAtEpochMs", 500,
                "deleted", false,
                "data", Map.of("notes", "older")
        );
        assertThat(syncService.push(userId, List.of(first)).get("applied")).isEqualTo(1);
        assertThat(syncService.push(userId, List.of(duplicate)).get("duplicates")).isEqualTo(1);
        assertThat(syncService.push(userId, List.of(older)).get("conflictsServerWins")).isEqualTo(1);
        var pull = syncService.pull(userId, 0);
        assertThat(pull.get("timestamp")).isNotNull();
        assertThat(syncService.lastSync(userId)).isNotNull();
    }
}
