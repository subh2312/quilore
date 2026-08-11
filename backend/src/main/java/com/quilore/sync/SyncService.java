package com.quilore.sync;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Deterministic pull-push sync with last-write-wins conflict resolution (Story 12.2).
 */
@Service
public class SyncService {

    public record Record(String collection, String id, long updatedAtEpochMs, Map<String, Object> data, boolean deleted) {}

    private final Map<String, Record> store = new ConcurrentHashMap<>();
    private final Map<UUID, Instant> lastSuccessfulSync = new ConcurrentHashMap<>();
    private final Map<String, Boolean> appliedMutations = new ConcurrentHashMap<>();

    public Map<String, Object> pull(UUID userId, long lastPulledAtEpochMs) {
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> updated = new ArrayList<>();
        List<String> deleted = new ArrayList<>();
        for (Record record : store.values()) {
            if (!String.valueOf(record.data().getOrDefault("userId", "")).equals(userId.toString())) {
                continue;
            }
            if (record.updatedAtEpochMs() <= lastPulledAtEpochMs) {
                continue;
            }
            if (record.deleted()) {
                deleted.add(record.id());
            } else if (record.updatedAtEpochMs() > 0 && lastPulledAtEpochMs == 0) {
                created.add(toMap(record));
            } else {
                updated.add(toMap(record));
            }
        }
        Instant now = Instant.now();
        lastSuccessfulSync.put(userId, now);
        return Map.of(
                "changes", Map.of("created", created, "updated", updated, "deleted", deleted),
                "timestamp", now.toEpochMilli()
        );
    }

    public Map<String, Object> push(UUID userId, List<Map<String, Object>> mutations) {
        int applied = 0;
        int duplicates = 0;
        int conflictsWon = 0;
        for (Map<String, Object> mutation : mutations) {
            String mutationId = String.valueOf(mutation.get("mutationId"));
            if (appliedMutations.containsKey(mutationId)) {
                duplicates++;
                continue;
            }
            String collection = String.valueOf(mutation.get("collection"));
            String id = String.valueOf(mutation.get("id"));
            long clientUpdatedAt = ((Number) mutation.get("updatedAtEpochMs")).longValue();
            boolean deleted = Boolean.TRUE.equals(mutation.get("deleted"));
            @SuppressWarnings("unchecked")
            Map<String, Object> data = new LinkedHashMap<>((Map<String, Object>) mutation.getOrDefault("data", Map.of()));
            data.put("userId", userId.toString());
            String key = collection + ":" + id;
            Record existing = store.get(key);
            if (existing != null && existing.updatedAtEpochMs() > clientUpdatedAt) {
                // Server wins on newer timestamp.
                conflictsWon++;
                appliedMutations.put(mutationId, true);
                continue;
            }
            store.put(key, new Record(collection, id, clientUpdatedAt, data, deleted));
            appliedMutations.put(mutationId, true);
            applied++;
        }
        Instant now = Instant.now();
        lastSuccessfulSync.put(userId, now);
        return Map.of(
                "applied", applied,
                "duplicates", duplicates,
                "conflictsServerWins", conflictsWon,
                "lastSuccessfulSync", now.toString()
        );
    }

    public Instant lastSync(UUID userId) {
        return lastSuccessfulSync.get(userId);
    }

    private static Map<String, Object> toMap(Record record) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("collection", record.collection());
        map.put("id", record.id());
        map.put("updatedAtEpochMs", record.updatedAtEpochMs());
        map.put("data", record.data());
        map.put("deleted", record.deleted());
        return map;
    }
}
