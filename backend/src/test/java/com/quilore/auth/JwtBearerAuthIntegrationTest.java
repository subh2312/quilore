package com.quilore.auth;

import com.quilore.security.SecurityProperties;
import com.quilore.security.SecuritySecretsValidator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * B1: executable proof that Bearer JWTs establish Spring Security principal/roles.
 */
@SpringBootTest
@AutoConfigureMockMvc
class JwtBearerAuthIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @Autowired SecurityProperties securityProperties;
    @Autowired UserRepository userRepository;

    @Test
    void userBearerTokenAccessesMeAndIsRejectedFromAdmin() throws Exception {
        String email = "user-" + UUID.randomUUID() + "@quilore.test";
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","displayName":"User"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(
                registered.getResponse().getContentAsString(), "$.accessToken");
        String userId = com.jayway.jsonpath.JsonPath.read(
                registered.getResponse().getContentAsString(), "$.user.id");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId))
                .andExpect(jsonPath("$.role").value("USER"));

        mockMvc.perform(get("/api/admin/health")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("forbidden"));
    }

    @Test
    void adminBearerTokenAccessesAdminEndpoint() throws Exception {
        String email = "admin-" + UUID.randomUUID() + "@quilore.test";
        var user = authService.register(email, "password123", "Admin");
        authService.updateRole(user.id(), "ADMIN");
        var session = authService.login(email, "password123");

        mockMvc.perform(get("/api/admin/health")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + session.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scope").value("admin"))
                .andExpect(jsonPath("$.actor").value(user.id().toString()));
    }

    @Test
    void missingTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    @Test
    void tamperedTokenIsUnauthorized() throws Exception {
        String email = "tamper-" + UUID.randomUUID() + "@quilore.test";
        var session = authService.loginAfterRegister(
                authService.register(email, "password123", "T").email(), "password123");
        String tampered = session.accessToken().substring(0, session.accessToken().length() - 4) + "dead";

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsUnauthorized() throws Exception {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String expired = authService.issueTestToken(
                userId,
                "USER",
                now.minusSeconds(7200),
                now.minusSeconds(3600),
                securityProperties.getJwtIssuer(),
                securityProperties.getJwtAudience()
        );

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void wrongIssuerAndAudienceAreUnauthorized() throws Exception {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        String wrongIssuer = authService.issueTestToken(
                userId, "USER", now, now.plusSeconds(3600),
                "not-quilore", securityProperties.getJwtAudience());
        String wrongAudience = authService.issueTestToken(
                userId, "USER", now, now.plusSeconds(3600),
                securityProperties.getJwtIssuer(), "not-the-api");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + wrongIssuer))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + wrongAudience))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesAndPersistsHashedSession() throws Exception {
        String email = "refresh-" + UUID.randomUUID() + "@quilore.test";
        MvcResult registered = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","displayName":"R"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        String refresh = com.jayway.jsonpath.JsonPath.read(
                registered.getResponse().getContentAsString(), "$.refreshToken");

        MvcResult refreshed = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String newRefresh = com.jayway.jsonpath.JsonPath.read(
                refreshed.getResponse().getContentAsString(), "$.refreshToken");
        assertThat(newRefresh).isNotEqualTo(refresh);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void productionLikeMissingJwtSecretFailsValidation() {
        assertThatThrownBy(() -> SecuritySecretsValidator.validateJwtSecret("", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
        assertThatThrownBy(() -> SecuritySecretsValidator.validateJwtSecret("short", false))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> SecuritySecretsValidator.validateJwtSecret(
                "dev-only-jwt-secret-change-me-32b!!", false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void registeredUsersAreDurableInRepository() {
        String email = "persist-" + UUID.randomUUID() + "@quilore.test";
        var user = authService.register(email, "password123", "Persist");
        assertThat(userRepository.findById(user.id())).isPresent();
        assertThat(userRepository.findByEmailIgnoreCase(email)).isPresent();
    }
}
