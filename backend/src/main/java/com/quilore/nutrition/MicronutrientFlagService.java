package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MicronutrientFlagService {

    public record ThresholdConfig(String version, double underFraction, int windowDays, int minBreaches) {}
    public record Flag(UUID id, UUID userId, String nutrient, String window, String message,
                       Instant createdAt, boolean dismissed) {}

    private final ThresholdConfig thresholds = new ThresholdConfig("micro-flags-v1", 0.8, 3, 2);
    private final Map<UUID, List<Flag>> flags = new ConcurrentHashMap<>();

    public ThresholdConfig thresholds() {
        return thresholds;
    }

    public List<Flag> evaluate(UUID userId, Map<String, Double> targets, List<Map<String, Double>> dailyIntake) {
        List<Flag> created = new ArrayList<>();
        for (Map.Entry<String, Double> target : targets.entrySet()) {
            String nutrient = target.getKey();
            long breaches = dailyIntake.stream()
                    .map(day -> day.getOrDefault(nutrient, 0.0))
                    .filter(v -> v < target.getValue() * thresholds.underFraction())
                    .count();
            if (breaches >= thresholds.minBreaches()) {
                Flag flag = new Flag(
                        UUID.randomUUID(),
                        userId,
                        nutrient,
                        thresholds.windowDays() + "d",
                        "Repeated shortfall in " + nutrient.replace('_', ' ')
                                + " over the last " + thresholds.windowDays() + " days.",
                        Instant.now(),
                        false
                );
                flags.compute(userId, (k, list) -> {
                    List<Flag> out = list == null ? new ArrayList<>() : new ArrayList<>(list);
                    out.add(flag);
                    return out;
                });
                created.add(flag);
            }
        }
        return created;
    }

    public List<Flag> active(UUID userId) {
        return flags.getOrDefault(userId, List.of()).stream().filter(f -> !f.dismissed()).toList();
    }

    public Flag dismiss(UUID userId, UUID flagId) {
        List<Flag> list = flags.getOrDefault(userId, List.of());
        List<Flag> updated = new ArrayList<>();
        Flag found = null;
        for (Flag flag : list) {
            if (flag.id().equals(flagId)) {
                found = new Flag(flag.id(), flag.userId(), flag.nutrient(), flag.window(),
                        flag.message(), flag.createdAt(), true);
                updated.add(found);
            } else {
                updated.add(flag);
            }
        }
        if (found == null) {
            throw new IllegalArgumentException("Flag not found");
        }
        flags.put(userId, updated);
        return found;
    }

    public String coachingCallout(String nutrient) {
        String n = nutrient.toLowerCase(Locale.ROOT);
        if (n.contains("iron")) {
            return "Consider pairing dal/leafy greens with vitamin-C foods; coaching estimate only.";
        }
        if (n.contains("protein")) {
            return "Spread protein across meals; this is a coaching flag, not a diagnosis.";
        }
        return "Review recent intake for " + nutrient + "; editable coaching suggestion.";
    }
}
