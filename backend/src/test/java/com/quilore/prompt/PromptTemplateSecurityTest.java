package com.quilore.prompt;

import com.quilore.auth.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PromptTemplateSecurityTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @Autowired PromptTemplateService promptTemplateService;

    private String userToken;
    private String adminToken;
    private String promptKey;

    @BeforeEach
    void setUp() {
        promptKey = "coach.system." + UUID.randomUUID();
        promptTemplateService.create(promptKey, "Internal guardrails", "llama", "admin");
        promptTemplateService.activate(promptKey, 1, "admin");

        String userEmail = "prompt-user-" + UUID.randomUUID() + "@quilore.test";
        authService.register(userEmail, "password123", "Prompt User");
        userToken = authService.login(userEmail, "password123").accessToken();

        String adminEmail = "prompt-admin-" + UUID.randomUUID() + "@quilore.test";
        var admin = authService.register(adminEmail, "password123", "Prompt Admin");
        authService.updateRole(admin.id(), "ADMIN");
        adminToken = authService.login(adminEmail, "password123").accessToken();
    }

    @Test
    void regularUserCannotReadActivePromptBody() throws Exception {
        mockMvc.perform(get("/api/admin/prompts/" + promptKey + "/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanReadActivePromptBody() throws Exception {
        mockMvc.perform(get("/api/admin/prompts/" + promptKey + "/active")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value("Internal guardrails"));
    }
}
