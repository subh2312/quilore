package com.quilore.content;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class ExerciseContentService {

    private static final Pattern HTTP_URL = Pattern.compile("^https?://.+", Pattern.CASE_INSENSITIVE);

    private final Map<UUID, ExerciseContent> store = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> audit = new ArrayList<>();

    public ExerciseContent upsert(String slug, String name, String instructions, String coachingCues,
                                  String demoAssetUrl, boolean publish, String actor) {
        if (demoAssetUrl != null && !demoAssetUrl.isBlank() && !HTTP_URL.matcher(demoAssetUrl).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid demo asset URL");
        }
        Optional<ExerciseContent> existing = store.values().stream()
                .filter(e -> e.slug().equals(slug))
                .findFirst();
        ExerciseContent next;
        if (existing.isEmpty()) {
            next = new ExerciseContent(
                    UUID.randomUUID(), slug, name, instructions, coachingCues,
                    blankToNull(demoAssetUrl), publish, 1, actor, Instant.now()
            );
        } else {
            ExerciseContent prev = existing.get();
            next = new ExerciseContent(
                    prev.id(), slug, name, instructions, coachingCues,
                    blankToNull(demoAssetUrl), publish, prev.version() + 1, actor, Instant.now()
            );
        }
        store.put(next.id(), next);
        synchronized (audit) {
            audit.add(Map.of(
                    "exerciseId", next.id().toString(),
                    "version", next.version(),
                    "actor", actor,
                    "published", next.published(),
                    "at", Instant.now().toString()
            ));
        }
        return next;
    }

    public List<ExerciseContent> listPublished() {
        return store.values().stream().filter(ExerciseContent::published).toList();
    }

    public List<Map<String, Object>> auditTrail() {
        synchronized (audit) {
            return List.copyOf(audit);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
