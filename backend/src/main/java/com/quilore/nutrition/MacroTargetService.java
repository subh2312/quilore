package com.quilore.nutrition;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MacroTargetService {

    public record Policy(String goalType, double calorieDeltaFraction, double proteinPerKg,
                         double fatFraction, String version) {}

    public record TargetSnapshot(
            UUID id,
            UUID userId,
            String goalType,
            double weightKg,
            double heightCm,
            int age,
            String sex,
            String activityLevel,
            int targetCalories,
            double targetProteinG,
            double targetFatG,
            double targetCarbsG,
            String policyVersion,
            Instant effectiveFrom
    ) {}

    private final Map<String, Policy> policies = Map.of(
            "maintain", new Policy("maintain", 0.0, 1.6, 0.25, "macro-policy-v1"),
            "deficit", new Policy("deficit", -0.15, 1.8, 0.25, "macro-policy-v1"),
            "surplus", new Policy("surplus", 0.10, 1.8, 0.25, "macro-policy-v1")
    );

    private final MacroTargetSnapshotRepository snapshotRepository;

    public MacroTargetService(MacroTargetSnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    @Transactional
    public TargetSnapshot calculate(UUID userId, String goalType, double weightKg, double heightCm,
                                    int age, String sex, String activityLevel) {
        Policy policy = policies.getOrDefault(normalizeGoalType(goalType), policies.get("maintain"));
        double bmr = mifflin(weightKg, heightCm, age, sex);
        double tdee = bmr * activityFactor(activityLevel);
        int calories = (int) Math.round(tdee * (1.0 + policy.calorieDeltaFraction()));
        double protein = weightKg * policy.proteinPerKg();
        double fat = (calories * policy.fatFraction()) / 9.0;
        double carbs = Math.max(0, (calories - (protein * 4.0) - (fat * 9.0)) / 4.0);

        MacroTargetSnapshotEntity entity = new MacroTargetSnapshotEntity();
        entity.setUserId(userId);
        entity.setGoalType(policy.goalType());
        entity.setWeightKg(weightKg);
        entity.setHeightCm(heightCm);
        entity.setAge(age);
        entity.setSex(sex);
        entity.setActivityLevel(activityLevel);
        entity.setTargetCalories(calories);
        entity.setTargetProteinG(round1(protein));
        entity.setTargetFatG(round1(fat));
        entity.setTargetCarbsG(round1(carbs));
        entity.setPolicyVersion(policy.version());
        entity.setEffectiveFrom(Instant.now());
        return toSnapshot(snapshotRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<TargetSnapshot> history(UUID userId) {
        return snapshotRepository.findByUserIdOrderByEffectiveFromAsc(userId).stream()
                .map(this::toSnapshot)
                .toList();
    }

    public Map<String, Policy> policies() {
        return policies;
    }

    /** Map product goal keys (fat_loss, muscle_gain, …) onto macro policy vocabulary. */
    public static String normalizeGoalType(String goalType) {
        if (goalType == null || goalType.isBlank()) {
            return "maintain";
        }
        String key = goalType.trim().toLowerCase();
        return switch (key) {
            case "fat_loss", "deficit", "cut" -> "deficit";
            case "muscle_gain", "surplus", "bulk" -> "surplus";
            case "recomp", "maintain", "performance", "maintenance" -> "maintain";
            default -> policiesContains(key) ? key : "maintain";
        };
    }

    private static boolean policiesContains(String key) {
        return key.equals("maintain") || key.equals("deficit") || key.equals("surplus");
    }

    private TargetSnapshot toSnapshot(MacroTargetSnapshotEntity entity) {
        return new TargetSnapshot(
                entity.getId(),
                entity.getUserId(),
                entity.getGoalType(),
                entity.getWeightKg(),
                entity.getHeightCm(),
                entity.getAge(),
                entity.getSex(),
                entity.getActivityLevel(),
                entity.getTargetCalories(),
                entity.getTargetProteinG(),
                entity.getTargetFatG(),
                entity.getTargetCarbsG(),
                entity.getPolicyVersion(),
                entity.getEffectiveFrom()
        );
    }

    private static double mifflin(double weightKg, double heightCm, int age, String sex) {
        boolean male = sex != null && sex.toLowerCase().startsWith("m");
        return male
                ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
                : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    }

    private static double activityFactor(String level) {
        if (level == null) {
            return 1.2;
        }
        return switch (level.toLowerCase()) {
            case "light" -> 1.375;
            case "moderate" -> 1.55;
            case "high" -> 1.725;
            default -> 1.2;
        };
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    public Map<String, Object> toMap(TargetSnapshot s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.id().toString());
        map.put("userId", s.userId().toString());
        map.put("goalType", s.goalType());
        map.put("targetCalories", s.targetCalories());
        map.put("targetProteinG", s.targetProteinG());
        map.put("targetFatG", s.targetFatG());
        map.put("targetCarbsG", s.targetCarbsG());
        map.put("policyVersion", s.policyVersion());
        map.put("effectiveFrom", s.effectiveFrom().toString());
        return map;
    }
}
