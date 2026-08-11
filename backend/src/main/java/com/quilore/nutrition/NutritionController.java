package com.quilore.nutrition;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/nutrition")
public class NutritionController {

    private final IcmrRdaService rdaService;
    private final MacroTargetService macroTargetService;
    private final MicronutrientFlagService flagService;
    private final IfctFoodResolutionService foodResolutionService;
    private final ManualMealNutritionService mealNutritionService;
    private final NutritionTrainingInsightService insightService;

    public NutritionController(
            IcmrRdaService rdaService,
            MacroTargetService macroTargetService,
            MicronutrientFlagService flagService,
            IfctFoodResolutionService foodResolutionService,
            ManualMealNutritionService mealNutritionService,
            NutritionTrainingInsightService insightService
    ) {
        this.rdaService = rdaService;
        this.macroTargetService = macroTargetService;
        this.flagService = flagService;
        this.foodResolutionService = foodResolutionService;
        this.mealNutritionService = mealNutritionService;
        this.insightService = insightService;
    }

    @PostMapping("/targets/macros/{userId}")
    public ResponseEntity<?> macroTargets(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var snapshot = macroTargetService.calculate(
                owner,
                String.valueOf(body.getOrDefault("goalType", "maintain")),
                ((Number) body.get("weightKg")).doubleValue(),
                ((Number) body.get("heightCm")).doubleValue(),
                ((Number) body.get("age")).intValue(),
                String.valueOf(body.get("sex")),
                String.valueOf(body.getOrDefault("activityLevel", "moderate"))
        );
        return ResponseEntity.ok(macroTargetService.toMap(snapshot));
    }

    @GetMapping("/targets/macros/{userId}/history")
    public ResponseEntity<?> macroHistory(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(macroTargetService.history(owner).stream().map(macroTargetService::toMap).toList());
    }

    @PostMapping("/targets/micros")
    public ResponseEntity<?> microTargets(@RequestBody Map<String, Object> body) {
        CurrentUser.requireAuthentication();
        var targets = rdaService.targetsFor(new IcmrRdaService.ProfileInput(
                ((Number) body.getOrDefault("age", 30)).intValue(),
                String.valueOf(body.getOrDefault("sex", "female")),
                Boolean.TRUE.equals(body.get("pregnant")),
                Boolean.TRUE.equals(body.get("lactating"))
        ));
        return ResponseEntity.ok(Map.of(
                "source", "ICMR-NIN-RDA-approx-v1",
                "disclaimer", "Informational nutrition guidance only — not medical advice.",
                "targets", targets
        ));
    }

    @PostMapping("/flags/{userId}/evaluate")
    public ResponseEntity<?> evaluateFlags(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        @SuppressWarnings("unchecked")
        Map<String, Double> targets = (Map<String, Double>) body.get("targets");
        @SuppressWarnings("unchecked")
        List<Map<String, Double>> days = (List<Map<String, Double>>) body.get("dailyIntake");
        var flags = flagService.evaluate(owner, targets, days);
        return ResponseEntity.ok(flags.stream().map(f -> Map.of(
                "id", f.id().toString(),
                "nutrient", f.nutrient(),
                "window", f.window(),
                "message", f.message(),
                "callout", flagService.coachingCallout(f.nutrient()),
                "thresholdVersion", flagService.thresholds().version()
        )).toList());
    }

    @GetMapping("/foods/resolve")
    public ResponseEntity<?> resolveFood(@RequestParam String q) {
        CurrentUser.requireAuthentication();
        return ResponseEntity.ok(foodResolutionService.resolve(q).stream().map(c -> Map.of(
                "code", c.food().code(),
                "name", c.food().name(),
                "score", c.score(),
                "matchType", c.matchType(),
                "dataset", "IFCT-2017-subset"
        )).toList());
    }

    @PostMapping("/meals/calculate")
    public ResponseEntity<?> calculateMeal(@RequestBody Map<String, Object> body) {
        CurrentUser.requireAuthentication();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) body.get("items");
        var totals = mealNutritionService.calculate(lines);
        return ResponseEntity.ok(Map.of(
                "calories", totals.calories(),
                "proteinG", totals.proteinG(),
                "carbsG", totals.carbsG(),
                "fatG", totals.fatG(),
                "micros", totals.micros(),
                "disclaimer", "Informational nutrition estimate — not medical advice.",
                "items", totals.items().stream().map(i -> Map.of(
                        "foodCode", i.foodCode(),
                        "foodName", i.foodName(),
                        "grams", i.grams(),
                        "calories", i.calories(),
                        "proteinG", i.proteinG(),
                        "carbsG", i.carbsG(),
                        "fatG", i.fatG()
                )).toList()
        ));
    }

    @PostMapping("/insights/training")
    public ResponseEntity<?> insights(@RequestBody Map<String, Object> body) {
        CurrentUser.requireAuthentication();
        var insights = insightService.correlate(
                ((Number) body.getOrDefault("avgCalorieAdherence", 1)).doubleValue(),
                ((Number) body.getOrDefault("avgProteinAdherence", 1)).doubleValue(),
                ((Number) body.getOrDefault("avgTrainingVolumeDelta", 0)).doubleValue(),
                ((Number) body.getOrDefault("days", 7)).intValue()
        );
        return ResponseEntity.ok(insights.stream().map(insightService::toMap).toList());
    }
}
