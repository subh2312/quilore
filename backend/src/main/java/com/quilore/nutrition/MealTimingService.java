package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Combination checks and meal timing advisory (Story — combination & timing).
 */
@Service
public class MealTimingService {

    public record Flag(String code, String message, String severity) {}

    public List<Flag> evaluate(List<String> foods, String mealType, int hourOfDay) {
        List<Flag> flags = new ArrayList<>();
        List<String> lower = foods == null ? List.of() : foods.stream()
                .map(f -> f.toLowerCase(Locale.ROOT)).toList();
        boolean dairy = lower.stream().anyMatch(f -> f.contains("milk") || f.contains("curd") || f.contains("paneer"));
        boolean citrus = lower.stream().anyMatch(f -> f.contains("orange") || f.contains("lemon") || f.contains("amla"));
        if (dairy && citrus) {
            flags.add(new Flag(
                    "dairy_citrus",
                    "Dairy with citrus can feel heavy for some people — consider spacing them if digestion is sensitive (advisory).",
                    "info"
            ));
        }
        if ("dinner".equalsIgnoreCase(mealType) && hourOfDay >= 22) {
            flags.add(new Flag(
                    "late_dinner",
                    "Late dinner timing may affect sleep quality for some athletes — consider earlier fueling when practical.",
                    "info"
            ));
        }
        boolean fried = lower.stream().anyMatch(f -> f.contains("fried") || f.contains("pakora") || f.contains("samosa"));
        if (fried && "pre_workout".equalsIgnoreCase(mealType)) {
            flags.add(new Flag(
                    "heavy_preworkout",
                    "Heavy fried foods close to training can feel sluggish — lighter carbs/protein may sit better.",
                    "warn"
            ));
        }
        if (flags.isEmpty()) {
            flags.add(new Flag("ok", "No notable combination or timing flags for this meal.", "ok"));
        }
        return flags;
    }

    public Map<String, Object> toMap(Flag f) {
        return Map.of("code", f.code(), "message", f.message(), "severity", f.severity(), "judgmental", false);
    }
}
