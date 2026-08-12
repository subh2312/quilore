package com.quilore.adminops;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Admin food-alias mapping review and meal-scan correction queue (Stories 14.1, 14.2).
 */
@Service
public class AdminOpsService {

    public record AliasReview(UUID id, String rawName, String candidateCode, String status,
                              String reviewer, String notes, Instant createdAt, Instant reviewedAt) {}

    public record MealScanReview(UUID id, UUID userId, UUID mediaObjectId, Map<String, Object> modelOutput,
                                 Map<String, Object> userCorrection, String status, String reviewer,
                                 String decision, Instant createdAt, Instant reviewedAt) {}

    private final Map<UUID, AliasReview> aliases = new ConcurrentHashMap<>();
    private final Map<UUID, MealScanReview> scans = new ConcurrentHashMap<>();
    private final Map<String, String> activeAliases = new ConcurrentHashMap<>();
    private final Map<String, String> previousAliases = new ConcurrentHashMap<>();

    public AliasReview enqueueAlias(String rawName, String candidateCode) {
        AliasReview r = new AliasReview(UUID.randomUUID(), rawName, candidateCode, "PENDING",
                null, null, Instant.now(), null);
        aliases.put(r.id(), r);
        return r;
    }

    public AliasReview decideAlias(UUID id, String status, String reviewer, String notes, String canonicalCode) {
        AliasReview existing = aliases.get(id);
        if (existing == null) {
            throw new IllegalArgumentException("Unknown alias review");
        }
        if ("APPROVED".equalsIgnoreCase(status) && canonicalCode != null) {
            String key = existing.rawName().toLowerCase();
            String prior = activeAliases.get(key);
            if (prior != null) {
                previousAliases.put(key, prior);
            }
            activeAliases.put(key, canonicalCode);
        }
        AliasReview updated = new AliasReview(existing.id(), existing.rawName(),
                canonicalCode != null ? canonicalCode : existing.candidateCode(),
                status.toUpperCase(), reviewer, notes, existing.createdAt(), Instant.now());
        aliases.put(id, updated);
        return updated;
    }

    public AliasReview rollbackAlias(UUID id, String reviewer) {
        AliasReview existing = aliases.get(id);
        if (existing == null) {
            throw new IllegalArgumentException("Unknown alias review");
        }
        String key = existing.rawName().toLowerCase();
        String prev = previousAliases.get(key);
        if (prev == null) {
            activeAliases.remove(key);
        } else {
            activeAliases.put(key, prev);
        }
        AliasReview updated = new AliasReview(existing.id(), existing.rawName(), existing.candidateCode(),
                "ROLLED_BACK", reviewer, "Rollback applied", existing.createdAt(), Instant.now());
        aliases.put(id, updated);
        return updated;
    }

    public MealScanReview enqueueScan(UUID userId, UUID mediaId, Map<String, Object> model,
                                      Map<String, Object> correction) {
        MealScanReview r = new MealScanReview(UUID.randomUUID(), userId, mediaId,
                model == null ? Map.of() : Map.copyOf(model),
                correction == null ? null : Map.copyOf(correction),
                "PENDING", null, null, Instant.now(), null);
        scans.put(r.id(), r);
        return r;
    }

    public MealScanReview decideScan(UUID id, String decision, String reviewer) {
        MealScanReview existing = scans.get(id);
        if (existing == null) {
            throw new IllegalArgumentException("Unknown meal scan review");
        }
        String normalized = decision.toUpperCase();
        MealScanReview updated = new MealScanReview(existing.id(), existing.userId(), existing.mediaObjectId(),
                existing.modelOutput(), existing.userCorrection(), "REVIEWED", reviewer, normalized,
                existing.createdAt(), Instant.now());
        scans.put(id, updated);
        return updated;
    }

    public List<AliasReview> pendingAliases() {
        return aliases.values().stream().filter(a -> "PENDING".equals(a.status())).toList();
    }

    public List<MealScanReview> pendingScans() {
        return scans.values().stream().filter(s -> "PENDING".equals(s.status())).toList();
    }

    public Map<String, String> activeAliasMap() {
        return Map.copyOf(activeAliases);
    }

    public Map<String, Object> aliasMap(AliasReview r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.id().toString());
        m.put("rawName", r.rawName());
        m.put("candidateCode", r.candidateCode() == null ? "" : r.candidateCode());
        m.put("status", r.status());
        m.put("reviewer", r.reviewer() == null ? "" : r.reviewer());
        m.put("notes", r.notes() == null ? "" : r.notes());
        m.put("createdAt", r.createdAt().toString());
        return m;
    }

    public Map<String, Object> scanMap(MealScanReview r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.id().toString());
        m.put("userId", r.userId() == null ? "" : r.userId().toString());
        m.put("mediaObjectId", r.mediaObjectId() == null ? "" : r.mediaObjectId().toString());
        m.put("modelOutput", r.modelOutput());
        m.put("userCorrection", r.userCorrection() == null ? Map.of() : r.userCorrection());
        m.put("status", r.status());
        m.put("decision", r.decision() == null ? "" : r.decision());
        m.put("reviewer", r.reviewer() == null ? "" : r.reviewer());
        m.put("createdAt", r.createdAt().toString());
        return m;
    }
}
