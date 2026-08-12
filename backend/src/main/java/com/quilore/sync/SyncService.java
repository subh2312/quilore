package com.quilore.sync;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Deterministic pull-push sync with last-write-wins conflict resolution (Story 12.2).
 */
@Service
public class SyncService {

    public record Record(String collection, String id, long updatedAtEpochMs, Map<String, Object> data, boolean deleted) {}

    private final SyncRecordRepository recordRepository;
    private final SyncMutationRepository mutationRepository;
    private final SyncUserStateRepository userStateRepository;
    private final ObjectMapper objectMapper;

    public SyncService(
            SyncRecordRepository recordRepository,
            SyncMutationRepository mutationRepository,
            SyncUserStateRepository userStateRepository,
            ObjectMapper objectMapper
    ) {
        this.recordRepository = recordRepository;
        this.mutationRepository = mutationRepository;
        this.userStateRepository = userStateRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> pull(UUID userId, long lastPulledAtEpochMs) {
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> updated = new ArrayList<>();
        List<String> deleted = new ArrayList<>();
        for (SyncRecordEntity entity : recordRepository.findByUserIdAndUpdatedAtEpochMsGreaterThan(userId, lastPulledAtEpochMs)) {
            Record record = toRecord(entity);
            if (record.deleted()) {
                deleted.add(record.id());
            } else if (record.updatedAtEpochMs() > 0 && lastPulledAtEpochMs == 0) {
                created.add(toMap(record));
            } else {
                updated.add(toMap(record));
            }
        }
        Instant now = Instant.now();
        markLastSync(userId, now);
        return Map.of(
                "changes", Map.of("created", created, "updated", updated, "deleted", deleted),
                "timestamp", now.toEpochMilli()
        );
    }

    @Transactional
    public Map<String, Object> push(UUID userId, List<Map<String, Object>> mutations) {
        int applied = 0;
        int duplicates = 0;
        int conflictsWon = 0;
        for (Map<String, Object> mutation : mutations) {
            String mutationId = String.valueOf(mutation.get("mutationId"));
            if (mutationRepository.existsById(mutationId)) {
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

            SyncRecordEntity existing = recordRepository
                    .findByUserIdAndCollectionAndRecordId(userId, collection, id)
                    .orElse(null);
            if (existing != null && existing.getUpdatedAtEpochMs() > clientUpdatedAt) {
                conflictsWon++;
                saveMutation(mutationId, userId);
                continue;
            }
            SyncRecordEntity entity = existing != null ? existing : new SyncRecordEntity();
            entity.setUserId(userId);
            entity.setCollection(collection);
            entity.setRecordId(id);
            entity.setUpdatedAtEpochMs(clientUpdatedAt);
            entity.setDataJson(writeJson(data));
            entity.setDeleted(deleted);
            recordRepository.save(entity);
            saveMutation(mutationId, userId);
            applied++;
        }
        Instant now = Instant.now();
        markLastSync(userId, now);
        return Map.of(
                "applied", applied,
                "duplicates", duplicates,
                "conflictsServerWins", conflictsWon,
                "lastSuccessfulSync", now.toString()
        );
    }

    @Transactional(readOnly = true)
    public Instant lastSync(UUID userId) {
        return userStateRepository.findById(userId)
                .map(SyncUserStateEntity::getLastSuccessfulSync)
                .orElse(null);
    }

    private void saveMutation(String mutationId, UUID userId) {
        SyncMutationEntity mutation = new SyncMutationEntity();
        mutation.setMutationId(mutationId);
        mutation.setUserId(userId);
        mutationRepository.save(mutation);
    }

    private void markLastSync(UUID userId, Instant now) {
        SyncUserStateEntity state = userStateRepository.findById(userId).orElseGet(SyncUserStateEntity::new);
        state.setUserId(userId);
        state.setLastSuccessfulSync(now);
        userStateRepository.save(state);
    }

    private Record toRecord(SyncRecordEntity entity) {
        return new Record(
                entity.getCollection(),
                entity.getRecordId(),
                entity.getUpdatedAtEpochMs(),
                readJson(entity.getDataJson()),
                entity.isDeleted()
        );
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

    private String writeJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to serialize sync data", ex);
        }
    }

    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json == null ? "{}" : json, new TypeReference<>() {});
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to deserialize sync data", ex);
        }
    }
}
