package com.quilore;

import com.quilore.ai.AiEnvelopeValidator;
import com.quilore.ai.AiGatewayClient;
import com.quilore.auth.AuthService;
import com.quilore.workout.SessionSummaryService;
import com.quilore.workout.WorkoutSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AiGatewayAndWorkoutSessionTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @Autowired AiGatewayClient aiGatewayClient;
    @Autowired AiEnvelopeValidator envelopeValidator;
    @Autowired SessionSummaryService sessionSummaryService;
    @Autowired WorkoutSessionService workoutSessionService;

    @Test
    void envelopeValidatorRequiresEditableFields() {
        Map<String, Object> envelope = Map.of(
                "task", "chat",
                "provider", null,
                "fallback_used", false,
                "degraded", true,
                "content", Map.of("reply", "test"),
                "confidence", null,
                "message", "ok",
                "editable", true,
                "user_confirmation_required", true
        );
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
    void aiGatewayClientReturnsDegradedWhenServiceUnreachable() {
        Map<String, Object> envelope = aiGatewayClient.coachChat(Map.of("prompt", "hello"));
        assertThat(envelope).containsKey("degraded");
        assertThat(envelope.get("editable")).isEqualTo(true);
    }
}
