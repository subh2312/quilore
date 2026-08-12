package com.quilore;

import com.quilore.auth.AuthService;
import com.quilore.billing.EntitlementService;
import com.quilore.content.ExerciseContentService;
import com.quilore.notify.AsyncJobNotificationService;
import com.quilore.notify.MealReminderService;
import com.quilore.profile.ProfileMetricsService;
import com.quilore.prompt.PromptTemplateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PlatformDomainIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @Autowired EntitlementService entitlementService;
    @Autowired ExerciseContentService exerciseContentService;
    @Autowired PromptTemplateService promptTemplateService;
    @Autowired AsyncJobNotificationService asyncJobNotificationService;
    @Autowired MealReminderService mealReminderService;
    @Autowired ProfileMetricsService profileMetricsService;

    @Test
    void authRegisterLoginRefreshAndRejectBadPassword() throws Exception {
        String email = "athlete-" + UUID.randomUUID() + "@quilore.test";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","displayName":"Athlete"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString());

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        String refresh = com.jayway.jsonpath.JsonPath.read(login.getResponse().getContentAsString(), "$.refreshToken");

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"wrong-password"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "11111111-1111-1111-1111-111111111111", roles = "USER")
    void profileRequiresBaselineFieldsAndLabelsInjuries() throws Exception {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        mockMvc.perform(put("/api/profiles/" + userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"age\":28}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/profiles/" + userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"age":28,"sex":"female","heightCm":165,"weightKg":60,"injuriesInfo":"knee"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.injuriesDisclaimer").value(ProfileMetricsService.INJURY_DISCLAIMER));
    }

    @Test
    @WithMockUser(roles = "USER")
    void bodyMetricsAndCheckInsSupportHistoryQueries() {
        UUID userId = UUID.randomUUID();
        profileMetricsService.logMetric(userId, LocalDate.parse("2026-08-01"), 70.5, 80.0, "users/u/photo1");
        profileMetricsService.logMetric(userId, LocalDate.parse("2026-08-10"), 69.8, null, null);
        profileMetricsService.logCheckIn(userId, LocalDate.parse("2026-08-10"), 4, 3, 2, 4, "felt strong");
        assertThat(profileMetricsService.metricsBetween(
                userId, LocalDate.parse("2026-08-01"), LocalDate.parse("2026-08-05"))).hasSize(1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void exerciseContentIsVersionedAndRejectsBadAssets() throws Exception {
        mockMvc.perform(post("/api/admin/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"back-squat","name":"Back Squat","instructions":"Brace","coachingCues":"Knees out",
                                 "demoAssetUrl":"not-a-url","published":true}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/admin/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"back-squat","name":"Back Squat","instructions":"Brace","coachingCues":"Knees out",
                                 "demoAssetUrl":"https://cdn.example/squat.mp4","published":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        mockMvc.perform(post("/api/admin/exercises")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"back-squat","name":"Back Squat","instructions":"Brace harder","coachingCues":"Knees out",
                                 "demoAssetUrl":"https://cdn.example/squat.mp4","published":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        mockMvc.perform(get("/api/exercises"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("back-squat"));
    }

    @Test
    void promptTemplatesSupportActivateAndRollback() {
        var v1 = promptTemplateService.create("coach.system", "Be concise", "llama", "admin");
        var v2 = promptTemplateService.create("coach.system", "Be concise and kind", "llama", "admin");
        promptTemplateService.activate("coach.system", v2.version(), "admin");
        assertThat(promptTemplateService.getActive("coach.system").body()).contains("kind");
        promptTemplateService.rollback("coach.system", v1.version(), "admin");
        assertThat(promptTemplateService.getActive("coach.system").version()).isEqualTo(v1.version());
        assertThat(promptTemplateService.auditTrail()).isNotEmpty();
    }

    @Test
    void entitlementsAndQuotasAreServerEnforced() {
        UUID userId = UUID.randomUUID();
        entitlementService.assignPlan(userId, "FREE");
        assertThat(entitlementService.isFeatureEnabled(userId, "ai_meal_scan")).isFalse();
        assertThatThrownBy(() -> entitlementService.consumeQuota(userId, "ai_meal_scan"))
                .hasMessageContaining("403");

        entitlementService.assignPlan(userId, "PREMIUM");
        Map<String, Object> consumed = entitlementService.consumeQuota(userId, "ai_meal_scan");
        assertThat(consumed.get("used")).isEqualTo(1);
        assertThat(entitlementService.entitlementState(userId).get("historicalDataAccess")).isEqualTo(true);
    }

    @Test
    void asyncJobsNotifyOnCompletionAndFailure() {
        UUID userId = UUID.randomUUID();
        var job = asyncJobNotificationService.enqueue(userId, "meal_scan", "/nutrition/results/1");
        asyncJobNotificationService.markRunning(job.id());
        asyncJobNotificationService.complete(job.id(), "result://1");
        assertThat(asyncJobNotificationService.get(job.id()).status().name()).isEqualTo("COMPLETED");
        assertThat(asyncJobNotificationService.forUser(userId)).isNotEmpty();
        assertThat(asyncJobNotificationService.forUser(userId).getFirst().deepLink())
                .isEqualTo("/nutrition/results/1");

        var failed = asyncJobNotificationService.enqueue(userId, "program_gen", "/chat");
        asyncJobNotificationService.fail(failed.id(), "provider timeout");
        assertThat(asyncJobNotificationService.forUser(userId).stream()
                .anyMatch(n -> n.body().toLowerCase().contains("retry"))).isTrue();
    }

    @Test
    void mealRemindersRespectPrivacyAndRecentLogs() {
        UUID userId = UUID.randomUUID();
        mealReminderService.savePrefs(userId, true, 0, 24 * 60, true);
        Map<String, Object> sent = mealReminderService.maybeSendReminder(userId, LocalTime.of(12, 0));
        assertThat(sent.get("sent")).isEqualTo(true);
        assertThat(sent.get("privacySafe")).isEqualTo(true);
        assertThat(String.valueOf(sent.get("body"))).doesNotContain("meal");

        mealReminderService.recordMealLog(userId);
        Map<String, Object> suppressed = mealReminderService.maybeSendReminder(userId, LocalTime.of(12, 30));
        assertThat(suppressed.get("sent")).isEqualTo(false);
        assertThat(suppressed.get("reason")).isEqualTo("recent_meal_log");
    }
}
