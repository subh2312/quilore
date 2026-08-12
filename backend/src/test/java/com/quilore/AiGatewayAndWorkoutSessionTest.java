package com.quilore;

import com.quilore.ai.AiEnvelopeValidator;
import com.quilore.ai.AiGatewayClient;
import com.quilore.auth.AuthService;
import com.quilore.billing.EntitlementService;
import com.quilore.billing.UsageCounterEntity;
import com.quilore.billing.UsageCounterRepository;
import com.quilore.workout.SessionSummaryService;
import com.quilore.workout.WorkoutSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AiGatewayAndWorkoutSessionTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @SpyBean AiGatewayClient aiGatewayClient;
    @Autowired AiEnvelopeValidator envelopeValidator;
    @Autowired SessionSummaryService sessionSummaryService;
    @Autowired WorkoutSessionService workoutSessionService;
    @Autowired EntitlementService entitlementService;
    @Autowired UsageCounterRepository usageCounterRepository;

    @Test
    void envelopeValidatorRequiresEditableFields() {
        Map<String, Object> envelope = new java.util.LinkedHashMap<>();
        envelope.put("task", "chat");
        envelope.put("provider", null);
        envelope.put("fallback_used", false);
        envelope.put("degraded", true);
        envelope.put("content", Map.of("reply", "test"));
        envelope.put("confidence", null);
        envelope.put("message", "ok");
        envelope.put("editable", true);
        envelope.put("user_confirmation_required", true);
        assertThat(envelopeValidator.validate(envelope)).containsEntry("task", "chat");
    }

    @Test
    void sessionSummaryIsEditableAdvisory() {
        UUID user = UUID.randomUUID();
        var summary = sessionSummaryService.summarize(
                user,
                List.of(Map.of("name", "squat", "reps", 5, "load", 100.0)),
                45L,
                "2026-08-12T10:00:00Z"
        );
        assertThat(summary.get("editable")).isEqualTo(true);
        assertThat(summary.get("disclaimer")).asString().contains("not a medical");
        assertThat(summary.get("setCount")).isEqualTo(1);
    }

    @Test
    void coachChatReturnsEnvelopeWhenAuthenticated() throws Exception {
        String email = "coach-" + UUID.randomUUID() + "@quilore.test";
        authService.register(email, "password123", "Coach User");
        var login = authService.login(email, "password123");
        entitlementService.assignPlan(login.userId(), "PREMIUM");

        mockMvc.perform(post("/api/coach/chat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + login.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"prompt":"Suggest a deload week"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.envelope.task").value("chat"))
                .andExpect(jsonPath("$.envelope.degraded").isBoolean());
    }

    @Test
    void coachProgramReturns429OnceMonthlyQuotaIsExhausted() throws Exception {
        String email = "quota-" + UUID.randomUUID() + "@quilore.test";
        authService.register(email, "password123", "Quota User");
        var login = authService.login(email, "password123");
        String token = login.accessToken();
        entitlementService.assignPlan(login.userId(), "PREMIUM");
        UsageCounterEntity counter = new UsageCounterEntity();
        counter.setUserId(login.userId());
        counter.setFeatureKey("ai_advanced_coaching");
        counter.setPeriodStart(LocalDate.now().withDayOfMonth(1));
        counter.setUsedCount(299);
        usageCounterRepository.save(counter);

        mockMvc.perform(post("/api/coach/chat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"prompt":"Suggest a deload week"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/coach/program")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"prompt":"Build me a 4 week hypertrophy block"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.degraded").value(true))
                .andExpect(jsonPath("$.task").value("program"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("quota exceeded")));
    }

    @Test
    void nutritionFoodQualityReturns429WhenScanQuotaIsExhausted() throws Exception {
        String email = "nutrition-quota-" + UUID.randomUUID() + "@quilore.test";
        authService.register(email, "password123", "Nutrition Quota User");
        var login = authService.login(email, "password123");
        entitlementService.assignPlan(login.userId(), "PREMIUM");
        UsageCounterEntity counter = new UsageCounterEntity();
        counter.setUserId(login.userId());
        counter.setFeatureKey("ai_meal_scan");
        counter.setPeriodStart(LocalDate.now().withDayOfMonth(1));
        counter.setUsedCount(60);
        usageCounterRepository.save(counter);
        clearInvocations(aiGatewayClient);

        mockMvc.perform(post("/api/nutrition/food-quality")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + login.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dishes":["rajma chawal"],"notes":"post-workout lunch"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.degraded").value(true))
                .andExpect(jsonPath("$.task").value("food-quality"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("quota exceeded")));

        verify(aiGatewayClient, never()).foodQuality(anyList(), any());
    }

    @Test
    void workoutOcrMapReturns429WhenScanQuotaIsExhausted() throws Exception {
        String email = "ocr-quota-" + UUID.randomUUID() + "@quilore.test";
        authService.register(email, "password123", "OCR Quota User");
        var login = authService.login(email, "password123");
        entitlementService.assignPlan(login.userId(), "PREMIUM");
        UsageCounterEntity counter = new UsageCounterEntity();
        counter.setUserId(login.userId());
        counter.setFeatureKey("ai_meal_scan");
        counter.setPeriodStart(LocalDate.now().withDayOfMonth(1));
        counter.setUsedCount(60);
        usageCounterRepository.save(counter);
        clearInvocations(aiGatewayClient);

        mockMvc.perform(post("/api/workout/ocr-map")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + login.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"text":"Bench Press 3x5 @ 100","source":"on_device_ocr"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.degraded").value(true))
                .andExpect(jsonPath("$.task").value("ocr-map"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("quota exceeded")));

        verify(aiGatewayClient, never()).ocrMapToSchema(any(), any());
    }

    @Test
    void workoutSessionLifecyclePersistsSummary() throws Exception {
        String email = "workout-" + UUID.randomUUID() + "@quilore.test";
        authService.register(email, "password123", "Lifter");
        var login = authService.login(email, "password123");
        String token = login.accessToken();

        var started = mockMvc.perform(post("/api/workout/sessions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"push day\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String sessionId = com.jayway.jsonpath.JsonPath.read(
                started.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/workout/sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"exerciseName":"Bench Press","reps":8,"loadKg":60}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/workout/sessions/" + sessionId + "/complete")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"durationMinutes\":50}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.setCount").value(1))
                .andExpect(jsonPath("$.editable").value(true));

        mockMvc.perform(get("/api/workout/sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"));
    }

    @Test
    void sessionSummaryRejectsNonObjectExerciseArrays() throws Exception {
        String email = "summary-" + UUID.randomUUID() + "@quilore.test";
        authService.register(email, "password123", "Summary User");
        var login = authService.login(email, "password123");
        UUID userId = login.userId();

        mockMvc.perform(post("/api/workout/" + userId + "/session-summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + login.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"exercises":["not-an-object"],"durationMinutes":45}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aiGatewayClientReturnsDegradedWhenServiceUnreachable() {
        Map<String, Object> envelope = aiGatewayClient.coachChat(Map.of("prompt", "hello"));
        assertThat(envelope).containsKey("degraded");
        assertThat(envelope.get("editable")).isEqualTo(true);
    }
}
