package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * IFCT 2017–oriented food resolution with Indian/regional aliases (Story: food name resolution).
 */
@Service
public class IfctFoodResolutionService {

    public record Food(String code, String name, double kcal, double proteinG, double carbsG, double fatG,
                       Map<String, Double> microsPer100g) {}

    public record Candidate(Food food, double score, String matchType) {}

    private final Map<String, Food> foods = new LinkedHashMap<>();
    private final Map<String, String> aliases = new LinkedHashMap<>();

    public IfctFoodResolutionService() {
        add("A001", "Rice, raw, milled", 345, 6.8, 78.2, 0.5, Map.of("iron_mg", 0.7, "calcium_mg", 10.0));
        add("A015", "Chapati / roti (wheat)", 297, 9.5, 56.0, 3.7, Map.of("iron_mg", 2.5, "calcium_mg", 30.0));
        add("B012", "Dal, moong, cooked", 104, 7.0, 17.0, 0.4, Map.of("iron_mg", 1.4, "folate_ug", 40.0));
        add("C004", "Dalma (odisha style lentil veg)", 95, 5.5, 12.0, 2.5, Map.of("iron_mg", 1.8, "vitamin_c_mg", 4.0));
        add("D002", "Bhindi sabzi", 65, 2.0, 8.0, 3.0, Map.of("iron_mg", 0.8, "vitamin_c_mg", 12.0));
        add("E001", "Paneer", 265, 18.3, 1.2, 20.8, Map.of("calcium_mg", 208.0, "vitamin_a_ug", 60.0));
        aliases.put("dalma", "C004");
        aliases.put("roti", "A015");
        aliases.put("chapati", "A015");
        aliases.put("chawal", "A001");
        aliases.put("rice", "A001");
        aliases.put("moong dal", "B012");
        aliases.put("bhindi", "D002");
        aliases.put("lady finger", "D002");
    }

    public List<Candidate> resolve(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String q = query.trim().toLowerCase(Locale.ROOT);
        List<Candidate> out = new ArrayList<>();
        if (aliases.containsKey(q)) {
            Food food = foods.get(aliases.get(q));
            out.add(new Candidate(food, 1.0, "alias"));
        }
        for (Food food : foods.values()) {
            String name = food.name().toLowerCase(Locale.ROOT);
            if (name.equals(q)) {
                out.add(new Candidate(food, 1.0, "exact"));
            } else if (name.contains(q) || q.contains(name.split(",")[0].trim())) {
                out.add(new Candidate(food, 0.8, "partial"));
            }
        }
        return out.stream()
                .sorted(Comparator.comparingDouble(Candidate::score).reversed())
                .distinct()
                .limit(5)
                .toList();
    }

    public Food requireCanonical(String code) {
        Food food = foods.get(code);
        if (food == null) {
            throw new IllegalArgumentException("Unknown food code");
        }
        return food;
    }

    private void add(String code, String name, double kcal, double protein, double carbs, double fat,
                     Map<String, Double> micros) {
        foods.put(code, new Food(code, name, kcal, protein, carbs, fat, micros));
    }
}
