package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ManualMealNutritionService {

    public record LineItem(String foodCode, String foodName, double grams, double calories,
                           double proteinG, double carbsG, double fatG, Map<String, Double> micros) {}

    public record MealTotals(List<LineItem> items, double calories, double proteinG, double carbsG,
                             double fatG, Map<String, Double> micros) {}

    private final IfctFoodResolutionService foods;
    private final Map<String, Double> householdToGrams = Map.of(
            "roti", 40.0,
            "katori", 150.0,
            "bowl", 200.0,
            "cup", 240.0,
            "tbsp", 15.0,
            "tsp", 5.0,
            "piece", 50.0
    );

    public ManualMealNutritionService(IfctFoodResolutionService foods) {
        this.foods = foods;
    }

    public double normalizeToGrams(double amount, String unit) {
        if (unit == null || unit.isBlank() || unit.equalsIgnoreCase("g") || unit.equalsIgnoreCase("gram")
                || unit.equalsIgnoreCase("grams")) {
            return amount;
        }
        Double factor = householdToGrams.get(unit.toLowerCase(Locale.ROOT));
        if (factor == null) {
            throw new IllegalArgumentException("Unsupported unit: " + unit);
        }
        return amount * factor;
    }

    public MealTotals calculate(List<Map<String, Object>> lines) {
        List<LineItem> items = new ArrayList<>();
        double calories = 0, protein = 0, carbs = 0, fat = 0;
        Map<String, Double> micros = new LinkedHashMap<>();
        for (Map<String, Object> line : lines) {
            String code = String.valueOf(line.get("foodCode"));
            double amount = ((Number) line.getOrDefault("amount", 100)).doubleValue();
            String unit = String.valueOf(line.getOrDefault("unit", "g"));
            double grams = normalizeToGrams(amount, unit);
            var food = foods.requireCanonical(code);
            double factor = grams / 100.0;
            LineItem item = new LineItem(
                    food.code(), food.name(), grams,
                    round1(food.kcal() * factor),
                    round1(food.proteinG() * factor),
                    round1(food.carbsG() * factor),
                    round1(food.fatG() * factor),
                    scaleMicros(food.microsPer100g(), factor)
            );
            items.add(item);
            calories += item.calories();
            protein += item.proteinG();
            carbs += item.carbsG();
            fat += item.fatG();
            item.micros().forEach((k, v) -> micros.merge(k, v, Double::sum));
        }
        return new MealTotals(items, round1(calories), round1(protein), round1(carbs), round1(fat), micros);
    }

    private static Map<String, Double> scaleMicros(Map<String, Double> per100, double factor) {
        Map<String, Double> out = new LinkedHashMap<>();
        per100.forEach((k, v) -> out.put(k, round1(v * factor)));
        return out;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
