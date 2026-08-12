package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Persist manual (and scanned) meal entries for daily nutrition snapshots.
 */
@Service
public class MealLogService {

    public record MealEntry(UUID id, UUID userId, String sourceType, String mealType, Instant loggedAt,
                            String notes, Map<String, Object> totals, List<Map<String, Object>> items) {}

    private final Map<UUID, MealEntry> meals = new ConcurrentHashMap<>();

    public MealEntry save(UUID userId, String sourceType, String mealType, String notes,
                          Map<String, Object> totals, List<Map<String, Object>> items) {
        MealEntry entry = new MealEntry(
                UUID.randomUUID(), userId,
                sourceType == null ? "manual" : sourceType,
                mealType == null ? "meal" : mealType,
                Instant.now(), notes,
                totals == null ? Map.of() : Map.copyOf(totals),
                items == null ? List.of() : List.copyOf(items)
        );
        meals.put(entry.id(), entry);
        return entry;
    }

    public List<MealEntry> forUserOn(UUID userId, LocalDate day) {
        List<MealEntry> out = new ArrayList<>();
        for (MealEntry m : meals.values()) {
            if (!m.userId().equals(userId)) {
                continue;
            }
            LocalDate loggedDay = LocalDate.ofInstant(m.loggedAt(), ZoneOffset.UTC);
            if (day.equals(loggedDay)) {
                out.add(m);
            }
        }
        return out;
    }

    public Map<String, Object> dailySnapshot(UUID userId, LocalDate day, Map<String, Double> targets) {
        List<MealEntry> dayMeals = forUserOn(userId, day);
        double cal = 0, protein = 0, carbs = 0, fat = 0;
        for (MealEntry m : dayMeals) {
            cal += number(m.totals().get("calories"));
            protein += number(m.totals().get("proteinG"));
            carbs += number(m.totals().get("carbsG"));
            fat += number(m.totals().get("fatG"));
        }
        Map<String, Object> consumed = Map.of(
                "calories", round1(cal),
                "proteinG", round1(protein),
                "carbsG", round1(carbs),
                "fatG", round1(fat)
        );
        Map<String, Object> remaining = new LinkedHashMap<>();
        if (targets != null) {
            remaining.put("calories", round1(targets.getOrDefault("calories", 0.0) - cal));
            remaining.put("proteinG", round1(targets.getOrDefault("proteinG", 0.0) - protein));
            remaining.put("carbsG", round1(targets.getOrDefault("carbsG", 0.0) - carbs));
            remaining.put("fatG", round1(targets.getOrDefault("fatG", 0.0) - fat));
        }
        return Map.of(
                "date", day.toString(),
                "mealCount", dayMeals.size(),
                "consumed", consumed,
                "targets", targets == null ? Map.of() : targets,
                "remaining", remaining,
                "meals", dayMeals.stream().map(this::toMap).toList()
        );
    }

    public Map<String, Object> toMap(MealEntry m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", m.id().toString());
        out.put("sourceType", m.sourceType());
        out.put("mealType", m.mealType());
        out.put("loggedAt", m.loggedAt().toString());
        out.put("notes", m.notes() == null ? "" : m.notes());
        out.put("totals", m.totals());
        out.put("items", m.items());
        return out;
    }

    private static double number(Object v) {
        return v instanceof Number n ? n.doubleValue() : 0;
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
