package com.quilore.controller;

import com.quilore.auth.AuthService;
import com.quilore.security.Permission;
import com.quilore.security.PermissionAuditService;
import com.quilore.security.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PermissionAuditService permissionAuditService;

    @Autowired
    private AuthService authService;

    @BeforeEach
    void clearAudit() {
        permissionAuditService.clear();
    }

    @Test
    void anonymousCannotAccessAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/health"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"))
                .andExpect(jsonPath("$.message").value("Authentication is required."));
    }

    @Test
    @WithMockUser(username = "athlete", roles = "USER")
    void userCannotAccessAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/health"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("forbidden"))
                .andExpect(jsonPath("$.message")
                        .value("You do not have permission to perform this action."));
    }

    @Test
    @WithMockUser(username = "ops", roles = "ADMIN")
    void adminCanAccessAdminHealth() throws Exception {
        mockMvc.perform(get("/api/admin/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("admin"))
                .andExpect(jsonPath("$.actor").value("ops"));
    }

    @Test
    @WithMockUser(username = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", roles = "ADMIN")
    void roleChangesAreAuditable() throws Exception {
        var target = authService.register("role-target-" + UUID.randomUUID() + "@quilore.test", "password123", "T");
        mockMvc.perform(post("/api/admin/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + target.id() + "\",\"role\":\"SUPPORT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(true));

        assertThat(permissionAuditService.recentEvents()).isNotEmpty();
        assertThat(permissionAuditService.recentEvents().getLast().get("action"))
                .isEqualTo("CHANGE_ROLE");
        assertThat(permissionAuditService.recentEvents().getLast().get("actor"))
                .isEqualTo("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    }

    @Test
    void permissionMatrixMatchesRoles() {
        assertThat(Permission.MANAGE_USERS.allowedFor(UserRole.USER)).isFalse();
        assertThat(Permission.MANAGE_USERS.allowedFor(UserRole.ADMIN)).isTrue();
        assertThat(Permission.READ_SUPPORT_TOOLS.allowedFor(UserRole.SUPPORT)).isTrue();
        assertThat(Permission.READ_OWN_DATA.allowedFor(UserRole.USER)).isTrue();
    }
}
