package com.quilore;

import com.quilore.analytics.AnalyticsService;
import com.quilore.flags.FeatureFlagService;
import com.quilore.goals.GoalService;
import com.quilore.injury.InjuryTriageService;
import com.quilore.nutrition.MealLogService;
import com.quilore.nutrition.MealTimingService;
import com.quilore.privacy.PrivacyService;
import com.quilore.adminops.AdminOpsService;
import com.quilore.notify.WorkoutReminderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class BacklogGapServicesTest {

    @Autowired FeatureFlagService featureFlagService;
    @Autowired PrivacyService privacyService;
    @Autowired GoalService goalService;
    @Autowired AnalyticsService analyticsService;
    @Autowired InjuryTriageService injuryTriageService;
    @Autowired AdminOpsService adminOpsService;
    @Autowired WorkoutReminderService workoutReminderService;
    @Autowired MealLogService mealLogService;
    @Autowired MealTimingService mealTimingService;

    @Test
    void featureFlagsSupportCohortAndRollout() {
        UUID user = UUID.randomUUID();
        featureFlagService.setCohort("meal_scan", user, true);
        assertThat(featureFlagService.isEnabled("meal_scan", user, "production")).isTrue();
        assertThat(featureFlagService.evaluateAll(user, "production")).containsKey("advanced_coaching");
    }

    @Test
    void privacyExportDeletionAndNotificationSanitize() {
        UUID user = UUID.randomUUID();
        privacyService.recordConsent(user, "terms", "1.0", true, "1.0.0");
        privacyService.savePrefs(user, false, true, true);
        var export = privacyService.requestExport(user, "json");
        assertThat(export.status()).isEqualTo("QUEUED");
        assertThat(privacyService.buildExportPayload(user)).containsKey("consents");
        assertThat(privacyService.requestDeletion(user, "user_request").status()).isEqualTo("QUEUED");
        assertThat(privacyService.sanitizeNotificationBody(user, "Injury: knee tear", "You have an update"))
                .isEqualTo("You have an update");
    }

    @Test
    void goalsVersionAndProgressDashboard() {
        UUID user = UUID.randomUUID();
        goalService.save(user, "muscle_gain", List.of("strength"), "direct", Map.of("days", 4));
        goalService.save(user, "recomp", List.of(), "supportive", Map.of());
        assertThat(goalService.current(user).version()).isEqualTo(2);
        assertThat(goalService.progressDashboard(user, "week")).containsEntry("hasGoal", true);
    }

    @Test
    void analyticsRespectsConsentAndTaxonomy() {
        UUID user = UUID.randomUUID();
        assertThat(analyticsService.track(user, "meal_logged", Map.of()).get("reason"))
                .isEqualTo("consent_required");
        privacyService.savePrefs(user, true, true, true);
        assertThat(analyticsService.track(user, "meal_logged", Map.of("injuryNotes", "secret")).get("accepted"))
                .isEqualTo(true);
        assertThat(analyticsService.taxonomy().get("events")).asList().isNotEmpty();
    }

    @Test
    void injuryTriageReturnsRiskFlagNotDiagnosis() {
        UUID user = UUID.randomUUID();
        var fatigue = injuryTriageService.evaluate(user, "quads", List.of("sore", "tight"));
        assertThat(fatigue.riskFlag()).isEqualTo("FATIGUE");
        assertThat(fatigue.disclaimer()).contains("not a medical diagnosis");
        var risk = injuryTriageService.evaluate(user, "knee", List.of("sharp", "swelling"));
        assertThat(risk.riskFlag()).isEqualTo("INJURY_RISK");
        assertThat(injuryTriageService.toMap(risk)).containsEntry("diagnosis", false);
    }

    @Test
    void adminAliasAndMealScanQueues() {
        var alias = adminOpsService.enqueueAlias("dalma odia", "IFCT_DAL");
        var approved = adminOpsService.decideAlias(alias.id(), "APPROVED", "admin", "ok", "IFCT_DAL");
        assertThat(approved.status()).isEqualTo("APPROVED");
        assertThat(adminOpsService.activeAliasMap()).containsEntry("dalma odia", "IFCT_DAL");
        adminOpsService.rollbackAlias(alias.id(), "admin");
        var scan = adminOpsService.enqueueScan(UUID.randomUUID(), UUID.randomUUID(),
                Map.of("dishes", List.of("dal")), Map.of("dishes", List.of("dalma")));
        assertThat(adminOpsService.decideScan(scan.id(), "CORRECTED", "admin").decision())
                .isEqualTo("CORRECTED");
    }

    @Test
    void workoutRemindersDedupeAndPrivacy() {
        UUID user = UUID.randomUUID();
        workoutReminderService.savePrefs(user, true, 7, 0, "Asia/Kolkata", "quilore://workout", true);
        var first = workoutReminderService.maybeSend(user, "session-1", LocalTime.of(7, 0));
        var second = workoutReminderService.maybeSend(user, "session-1", LocalTime.of(7, 0));
        assertThat(first.get("sent")).isEqualTo(true);
        assertThat(second.get("reason")).isEqualTo("duplicate");
        assertThat(first.get("privacySafe")).isEqualTo(true);
    }

    @Test
    void mealLogDailySnapshotAndTimingFlags() {
        UUID user = UUID.randomUUID();
        mealLogService.save(user, "manual", "dinner", null,
                Map.of("calories", 500.0, "proteinG", 30.0, "carbsG", 40.0, "fatG", 20.0),
                List.of());
        var snap = mealLogService.dailySnapshot(user, LocalDate.now(java.time.ZoneOffset.UTC),
                Map.of("calories", 2000.0, "proteinG", 140.0, "carbsG", 200.0, "fatG", 70.0));
        assertThat(snap.get("mealCount")).isEqualTo(1);
        assertThat(mealTimingService.evaluate(List.of("paneer", "orange"), "dinner", 22))
                .extracting(MealTimingService.Flag::code)
                .contains("dairy_citrus", "late_dinner");
    }
}
