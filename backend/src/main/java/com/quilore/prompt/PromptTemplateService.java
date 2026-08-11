package com.quilore.prompt;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PromptTemplateService {

    private final Map<String, List<PromptVersion>> versions = new ConcurrentHashMap<>();
    private final Map<String, Integer> active = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> audit = new ArrayList<>();

    public record PromptVersion(String key, int version, String modelHint, String body, String createdBy, Instant createdAt) {}

    public PromptVersion create(String key, String body, String modelHint, String actor) {
        AtomicInteger next = new AtomicInteger(1);
        versions.compute(key, (k, list) -> {
            List<PromptVersion> out = list == null ? new ArrayList<>() : new ArrayList<>(list);
            int ver = out.stream().mapToInt(PromptVersion::version).max().orElse(0) + 1;
            next.set(ver);
            out.add(new PromptVersion(key, ver, modelHint == null ? "default" : modelHint, body, actor, Instant.now()));
            return out;
        });
        recordAudit(actor, "CREATE", key, next.get());
        return get(key, next.get());
    }

    public PromptVersion activate(String key, int version, String actor) {
        PromptVersion target = get(key, version);
        active.put(key, version);
        recordAudit(actor, "ACTIVATE", key, version);
        return target;
    }

    public PromptVersion rollback(String key, int version, String actor) {
        return activate(key, version, actor + " (rollback)");
    }

    public PromptVersion getActive(String key) {
        Integer ver = active.get(key);
        if (ver == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No active prompt");
        }
        return get(key, ver);
    }

    public List<PromptVersion> history(String key) {
        return versions.getOrDefault(key, List.of()).stream()
                .sorted(Comparator.comparingInt(PromptVersion::version))
                .toList();
    }

    public List<Map<String, Object>> auditTrail() {
        synchronized (audit) {
            return List.copyOf(audit);
        }
    }

    private PromptVersion get(String key, int version) {
        return versions.getOrDefault(key, List.of()).stream()
                .filter(v -> v.version() == version && Objects.equals(v.key(), key))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prompt version not found"));
    }

    private void recordAudit(String actor, String action, String key, int version) {
        synchronized (audit) {
            audit.add(Map.of(
                    "actor", actor,
                    "action", action,
                    "key", key,
                    "version", version,
                    "at", Instant.now().toString()
            ));
        }
    }
}
