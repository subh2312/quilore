package com.quilore.nutrition;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Cross-module coaching insights correlating nutrition adherence with training performance.
 * Messaging is suggestive, not causal.
 */
@Service
public class NutritionTrainingInsightService {

    public record Insight(String code, String message, String window) {}

    public List<Insight> correlate(double avgCalorieAdherence, double avgProteinAdherence,
                                   double avgTrainingVolumeDelta, int days) {
        List<Insight> insights = new ArrayList<>();
        String window = days + "d";
        if (avgProteinAdherence < 0.8 && avgTrainingVolumeDelta < 0) {
            insights.add(new Insight(
                    "protein_volume",
                    "Protein intake and training volume both trended lower recently — worth reviewing recovery fueling (suggestive, not causal).",
                    window
            ));
        }
        if (avgCalorieAdherence < 0.75 && avgTrainingVolumeDelta < -0.1) {
            insights.add(new Insight(
                    "energy_availability",
                    "Calorie intake ran below target while volume dipped — consider whether energy availability is limiting sessions.",
                    window
            ));
        }
        if (avgCalorieAdherence > 1.15 && avgTrainingVolumeDelta > 0.1) {
            insights.add(new Insight(
                    "surplus_progress",
                    "Surplus intake coincided with rising training volume — keep an eye on recovery markers.",
                    window
            ));
        }
        if (insights.isEmpty()) {
            insights.add(new Insight(
                    "stable",
                    "Nutrition adherence and training trends look relatively aligned over this window.",
                    window
            ));
        }
        return insights;
    }

    public Map<String, Object> toMap(Insight insight) {
        return Map.of(
                "code", insight.code(),
                "message", insight.message(),
                "window", insight.window(),
                "causalClaim", false
        );
    }
}
