package com.quilore.billing;

import com.quilore.auth.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BillingPurchaseSecurityTest {

    @Autowired MockMvc mockMvc;
    @Autowired AuthService authService;
    @Autowired EntitlementService entitlementService;
    @Autowired SubscriptionReceiptRepository receiptRepository;

    private String userToken;
    private UUID userId;
    private String otherUserToken;
    private UUID otherUserId;

    @BeforeEach
    void registerUsers() {
        receiptRepository.deleteAll();
        String email = "buyer-" + UUID.randomUUID() + "@quilore.test";
        String otherEmail = "other-" + UUID.randomUUID() + "@quilore.test";
        userId = authService.register(email, "password123", "Buyer").id();
        otherUserId = authService.register(otherEmail, "password123", "Other").id();
        userToken = authService.login(email, "password123").accessToken();
        otherUserToken = authService.login(otherEmail, "password123").accessToken();
        entitlementService.assignPlan(userId, "FREE");
        entitlementService.assignPlan(otherUserId, "FREE");
    }

    @Test
    void arbitraryTransactionIdCannotActivatePremium() throws Exception {
        mockMvc.perform(post("/api/billing/" + userId + "/purchase")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"premium_monthly","transactionId":"fake-tx-12345","store":"app_store"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.activated").value(false))
                .andExpect(jsonPath("$.reason").value("missing_receipt"))
                .andExpect(jsonPath("$.entitlements.plan").value("FREE"));
    }

    @Test
    void invalidReceiptCannotActivatePremium() throws Exception {
        mockMvc.perform(post("/api/billing/" + userId + "/purchase")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"premium_monthly","receipt":"not-a-real-receipt","platform":"mock"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.activated").value(false))
                .andExpect(jsonPath("$.reason").value("invalid_receipt"))
                .andExpect(jsonPath("$.entitlements.plan").value("FREE"));
    }

    @Test
    void mockReceiptActivatesPremiumWhenExplicitlyEnabled() throws Exception {
        mockMvc.perform(post("/api/billing/" + userId + "/purchase")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"premium_monthly","receipt":"UAT_MOCK_RECEIPT","platform":"mock"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activated").value(true))
                .andExpect(jsonPath("$.transactionId").value(org.hamcrest.Matchers.startsWith("mock-")))
                .andExpect(jsonPath("$.entitlements.plan").value("PREMIUM"));
    }

    @Test
    void validatedReceiptCannotBeClaimedByAnotherUser() throws Exception {
        mockMvc.perform(post("/api/billing/" + userId + "/purchase")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"premium_monthly","receipt":"UAT_MOCK_RECEIPT","platform":"mock"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activated").value(true));

        mockMvc.perform(post("/api/billing/" + otherUserId + "/purchase")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"premium_monthly","receipt":"UAT_MOCK_RECEIPT","platform":"mock"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.activated").value(false))
                .andExpect(jsonPath("$.reason").value("receipt_already_claimed"))
                .andExpect(jsonPath("$.entitlements.plan").value("FREE"));
    }

    @Test
    void restoreRequiresValidatedReceipt() throws Exception {
        mockMvc.perform(post("/api/billing/" + userId + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.restored").value(false))
                .andExpect(jsonPath("$.reason").value("no_prior_receipt"))
                .andExpect(jsonPath("$.entitlements.plan").value("FREE"));
    }

    @Test
    void restoreReactivatesAfterPriorValidatedPurchase() throws Exception {
        mockMvc.perform(post("/api/billing/" + userId + "/purchase")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"premium_monthly","receipt":"UAT_MOCK_RECEIPT","platform":"mock"}
                                """))
                .andExpect(status().isOk());

        entitlementService.assignPlan(userId, "FREE");

        mockMvc.perform(post("/api/billing/" + userId + "/restore")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.restored").value(true))
                .andExpect(jsonPath("$.entitlements.plan").value("PREMIUM"));
    }
}
