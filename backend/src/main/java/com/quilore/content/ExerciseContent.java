package com.quilore.content;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ExerciseContent(
        UUID id,
        String slug,
        String name,
        String instructions,
        String coachingCues,
        String demoAssetUrl,
        boolean published,
        int version,
        String updatedBy,
        Instant updatedAt
) {
    public Map<String, Object> toMap() {
        return Map.of(
                "id", id.toString(),
                "slug", slug,
                "name", name,
                "instructions", instructions,
                "coachingCues", coachingCues,
                "demoAssetUrl", demoAssetUrl == null ? "" : demoAssetUrl,
                "published", published,
                "version", version,
                "updatedBy", updatedBy == null ? "" : updatedBy,
                "updatedAt", updatedAt.toString()
        );
    }
}
