package com.quilore.nutrition;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class NutritionDomainTest {

    @Autowired MacroTargetService macroTargetService;
    @Autowired IcmrRdaService icmrRdaService;
    @Autowired MicronutrientFlagService flagService;
    @Autowired IfctFoodResolutionService foodResolutionService;
    @Autowired ManualMealNutritionService mealNutritionService;
    @Autowired NutritionTrainingInsightService insightService;

    @Test
    void macroTargetsAreVersionedAndReproducible() {
        UUID userId = UUID.randomUUID();
        var first = macroTargetService.calculate(userId, "deficit", 70, 175, 28, "male", "moderate");
        var second = macroTargetService.calculate(userId, "deficit", 70, 175, 28, "male", "moderate");
        assertThat(first.targetCalories()).isEqualTo(second.targetCalories());
        assertThat(first.policyVersion()).isEqualTo("macro-policy-v1");
        assertThat(macroTargetService.history(userId)).hasSize(2);
        assertThat(first.id()).isNotEqualTo(second.id());
    }

    @Test
    void productGoalKeysMapOntoMacroPolicies() {
        UUID userId = UUID.randomUUID();
        var fatLoss = macroTargetService.calculate(userId, "fat_loss", 90, 174, 33, "male", "moderate");
        var muscle = macroTargetService.calculate(userId, "muscle_gain", 90, 174, 33, "male", "moderate");
        var recomp = macroTargetService.calculate(userId, "recomp", 90, 174, 33, "male", "moderate");
        assertThat(fatLoss.goalType()).isEqualTo("deficit");
        assertThat(muscle.goalType()).isEqualTo("surplus");
        assertThat(recomp.goalType()).isEqualTo("maintain");
        assertThat(fatLoss.targetCalories()).isLessThan(recomp.targetCalories());
        assertThat(muscle.targetCalories()).isGreaterThan(recomp.targetCalories());
    }

    @Test
    void icmrTargetsAdjustForSexAndPregnancy() {
        var female = icmrRdaService.targetsFor(new IcmrRdaService.ProfileInput(30, "female", false, false));
        var pregnant = icmrRdaService.targetsFor(new IcmrRdaService.ProfileInput(30, "female", true, false));
        assertThat(female.get("iron_mg")).isGreaterThan(icmrRdaService.targetsFor(
                new IcmrRdaService.ProfileInput(30, "male", false, false)).get("iron_mg"));
        assertThat(pregnant.get("folate_ug")).isGreaterThan(female.get("folate_ug"));
    }

    @Test
    void shortfallFlagsIncludeMetricAndWindow() {
        UUID userId = UUID.randomUUID();
        Map<String, Double> targets = Map.of("iron_mg", 29.0);
        List<Map<String, Double>> days = List.of(
                Map.of("iron_mg", 10.0),
                Map.of("iron_mg", 12.0),
                Map.of("iron_mg", 11.0)
        );
        var flags = flagService.evaluate(userId, targets, days);
        assertThat(flags).isNotEmpty();
        assertThat(flags.getFirst().window()).isEqualTo("3d");
        assertThat(flagService.coachingCallout("iron_mg")).containsIgnoringCase("coaching");
    }

    @Test
    void ifctResolverReturnsAliasAndCalculatesManualMeals() {
        var candidates = foodResolutionService.resolve("dalma");
        assertThat(candidates).isNotEmpty();
        assertThat(candidates.getFirst().matchType()).isEqualTo("alias");
        double grams = mealNutritionService.normalizeToGrams(2, "roti");
        assertThat(grams).isEqualTo(80.0);
        var totals = mealNutritionService.calculate(List.of(
                Map.of("foodCode", candidates.getFirst().food().code(), "amount", 1, "unit", "bowl")
        ));
        assertThat(totals.calories()).isPositive();
        assertThat(totals.items()).hasSize(1);
    }

    @Test
    void trainingInsightsAreSuggestiveNotCausal() {
        var insights = insightService.correlate(0.7, 0.7, -0.2, 7);
        assertThat(insights).isNotEmpty();
        assertThat(insightService.toMap(insights.getFirst()).get("causalClaim")).isEqualTo(false);
    }
}
