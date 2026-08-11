package com.quilore.profile;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ProfileMetricsService {

    public static final String INJURY_DISCLAIMER =
            "Informational only — not a medical diagnosis.";

    public record Profile(
            UUID userId,
            Integer age,
            String sex,
            Double heightCm,
            Double weightKg,
            String trainingExperience,
            String dietaryPreferences,
            String injuriesInfo,
            String equipmentAccess,
            String injuriesDisclaimer,
            Instant updatedAt
    ) {}

    public record BodyMetric(UUID id, UUID userId, LocalDate recordedOn, Double weightKg, Double waistCm,
                             String photoObjectKey) {}

    public record CheckIn(UUID id, UUID userId, LocalDate recordedOn, Integer mood, Integer recovery,
                          Integer hunger, Integer energy, String notes) {}

    private final Map<UUID, Profile> profiles = new ConcurrentHashMap<>();
    private final Map<UUID, List<BodyMetric>> metrics = new ConcurrentHashMap<>();
    private final Map<UUID, List<CheckIn>> checkIns = new ConcurrentHashMap<>();

    public Profile upsertProfile(UUID userId, Map<String, Object> body) {
        require(body, "age", "sex", "heightCm", "weightKg");
        Profile profile = new Profile(
                userId,
                ((Number) body.get("age")).intValue(),
                String.valueOf(body.get("sex")),
                ((Number) body.get("heightCm")).doubleValue(),
                ((Number) body.get("weightKg")).doubleValue(),
                String.valueOf(body.getOrDefault("trainingExperience", "")),
                String.valueOf(body.getOrDefault("dietaryPreferences", "")),
                String.valueOf(body.getOrDefault("injuriesInfo", "")),
                String.valueOf(body.getOrDefault("equipmentAccess", "")),
                INJURY_DISCLAIMER,
                Instant.now()
        );
        profiles.put(userId, profile);
        return profile;
    }

    public Profile getProfile(UUID userId) {
        Profile profile = profiles.get(userId);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
        }
        return profile;
    }

    public BodyMetric logMetric(UUID userId, LocalDate date, Double weightKg, Double waistCm, String photoKey) {
        BodyMetric metric = new BodyMetric(UUID.randomUUID(), userId, date, weightKg, waistCm, photoKey);
        metrics.compute(userId, (k, list) -> {
            List<BodyMetric> out = list == null ? new ArrayList<>() : new ArrayList<>(list);
            out.add(metric);
            return out;
        });
        return metric;
    }

    public CheckIn logCheckIn(UUID userId, LocalDate date, Integer mood, Integer recovery,
                              Integer hunger, Integer energy, String notes) {
        validateMarker(mood);
        validateMarker(recovery);
        validateMarker(hunger);
        validateMarker(energy);
        CheckIn checkIn = new CheckIn(UUID.randomUUID(), userId, date, mood, recovery, hunger, energy, notes);
        checkIns.compute(userId, (k, list) -> {
            List<CheckIn> out = list == null ? new ArrayList<>() : new ArrayList<>(list);
            out.add(checkIn);
            return out;
        });
        return checkIn;
    }

    public List<BodyMetric> metricsBetween(UUID userId, LocalDate from, LocalDate to) {
        return metrics.getOrDefault(userId, List.of()).stream()
                .filter(m -> !m.recordedOn().isBefore(from) && !m.recordedOn().isAfter(to))
                .toList();
    }

    private static void require(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            if (body.get(key) == null || String.valueOf(body.get(key)).isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: " + key);
            }
        }
    }

    private static void validateMarker(Integer value) {
        if (value != null && (value < 1 || value > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Markers must be 1-5");
        }
    }
}
