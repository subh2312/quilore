package com.quilore.nutrition;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class MicronutrientFlagService {

    public record ThresholdConfig(String version, double underFraction, int windowDays, int minBreaches) {}
    public record Flag(UUID id, UUID userId, String nutrient, String window, String message,
                       Instant createdAt, boolean dismissed) {}

    private final ThresholdConfig thresholds = new ThresholdConfig("micro-flags-v1", 0.8, 3, 2);
    private final MicronutrientFlagRepository flagRepository;

    public MicronutrientFlagService(MicronutrientFlagRepository flagRepository) {
        this.flagRepository = flagRepository;
    }

    public ThresholdConfig thresholds() {
        return thresholds;
    }

    @Transactional
    public List<Flag> evaluate(UUID userId, Map<String, Double> targets, List<Map<String, Double>> dailyIntake) {
        List<Flag> created = new ArrayList<>();
        for (Map.Entry<String, Double> target : targets.entrySet()) {
            String nutrient = target.getKey();
            long breaches = dailyIntake.stream()
                    .map(day -> day.getOrDefault(nutrient, 0.0))
                    .filter(v -> v < target.getValue() * thresholds.underFraction())
                    .count();
            if (breaches >= thresholds.minBreaches()) {
                MicronutrientFlagEntity entity = new MicronutrientFlagEntity();
                entity.setUserId(userId);
                entity.setNutrient(nutrient);
                entity.setWindowLabel(thresholds.windowDays() + "d");
                entity.setMessage("Repeated shortfall in " + nutrient.replace('_', ' ')
                        + " over the last " + thresholds.windowDays() + " days.");
                entity.setCreatedAt(Instant.now());
                entity.setDismissed(false);
                created.add(toFlag(flagRepository.save(entity)));
            }
        }
        return created;
    }

    @Transactional(readOnly = true)
    public List<Flag> active(UUID userId) {
        return flagRepository.findByUserIdAndDismissedFalseOrderByCreatedAtDesc(userId).stream()
                .map(this::toFlag)
                .toList();
    }

    @Transactional
    public Flag dismiss(UUID userId, UUID flagId) {
        MicronutrientFlagEntity entity = flagRepository.findByIdAndUserId(flagId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Flag not found"));
        entity.setDismissed(true);
        return toFlag(flagRepository.save(entity));
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

    private Flag toFlag(MicronutrientFlagEntity entity) {
        return new Flag(
                entity.getId(),
                entity.getUserId(),
                entity.getNutrient(),
                entity.getWindowLabel(),
                entity.getMessage(),
                entity.getCreatedAt(),
                entity.isDismissed()
        );
    }
}
