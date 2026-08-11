package com.quilore.security;

import com.quilore.auth.AuthService;
import com.quilore.billing.EntitlementService;
import com.quilore.notify.AsyncJobNotificationService;
import com.quilore.profile.ProfileMetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B2: prove a normal user cannot read/mutate another user's owned resources.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ObjectLevelAuthorizationTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @Autowired ProfileMetricsService profileMetricsService;
    @Autowired EntitlementService entitlementService;
    @Autowired AsyncJobNotificationService asyncJobNotificationService;

    private String userAToken;
    private UUID userAId;
    private UUID userBId;

    @BeforeEach
    void registerUsers() {
        String emailA = "a-" + UUID.randomUUID() + "@quilore.test";
        String emailB = "b-" + UUID.randomUUID() + "@quilore.test";
        var a = authService.register(emailA, "password123", "A");
        var b = authService.register(emailB, "password123", "B");
        userAId = a.id();
        userBId = b.id();
        userAToken = authService.login(emailA, "password123").accessToken();

        profileMetricsService.upsertProfile(userBId, java.util.Map.of(
                "age", 30, "sex", "male", "heightCm", 180, "weightKg", 80
        ));
        entitlementService.assignPlan(userBId, "PREMIUM");
        asyncJobNotificationService.enqueue(userBId, "meal_scan", "/nutrition/results/b");
    }

    @Test
    void userCannotReadAnotherProfile() throws Exception {
        mockMvc.perform(get("/api/profiles/" + userBId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCannotMutateAnotherProfile() throws Exception {
        mockMvc.perform(put("/api/profiles/" + userBId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"age":28,"sex":"female","heightCm":165,"weightKg":60}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCanAccessOwnProfile() throws Exception {
        mockMvc.perform(put("/api/profiles/" + userAId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"age":28,"sex":"female","heightCm":165,"weightKg":60}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userAId.toString()));
    }

    @Test
    void userCannotConsumeAnotherQuota() throws Exception {
        mockMvc.perform(post("/api/quotas/" + userBId + "/consume")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featureKey\":\"ai_meal_scan\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCannotRegisterMediaAsAnotherUser() throws Exception {
        mockMvc.perform(post("/api/media/register")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":"%s","content":"hello","contentType":"text/plain"}
                                """.formatted(userBId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.objectKey").value(org.hamcrest.Matchers.startsWith("users/" + userAId)));
    }

    @Test
    void userCannotReadAnotherNotificationsOrSync() throws Exception {
        mockMvc.perform(get("/api/notifications/" + userBId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/sync/" + userBId + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCannotPushSyncOrLogMetricsForAnotherUser() throws Exception {
        mockMvc.perform(post("/api/sync/" + userBId + "/push")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mutations\":[]}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/body-metrics/" + userBId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recordedOn":"%s","weightKg":70}
                                """.formatted(LocalDate.now())))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanAssignPlanWithAudit() throws Exception {
        String adminEmail = "admin-" + UUID.randomUUID() + "@quilore.test";
        var admin = authService.register(adminEmail, "password123", "Admin");
        authService.updateRole(admin.id(), "ADMIN");
        String adminToken = authService.login(adminEmail, "password123").accessToken();

        mockMvc.perform(post("/api/admin/entitlements/" + userBId + "/plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planCode\":\"FREE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("FREE"));
    }
}
