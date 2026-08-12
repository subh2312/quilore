package com.quilore.billing;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReceiptValidationService {

    public static final String STATUS_VALIDATED = "VALIDATED";

    public record VerifiedReceipt(String store, String productId, String transactionId) {}

    public record ActivationResult(
            boolean activated,
            String reason,
            String store,
            String productId,
            String transactionId
    ) {
        public static ActivationResult success(VerifiedReceipt receipt) {
            return new ActivationResult(
                    true,
                    null,
                    receipt.store(),
                    receipt.productId(),
                    receipt.transactionId()
            );
        }

        public static ActivationResult failure(String reason) {
            return new ActivationResult(false, reason, null, null, null);
        }
    }

    private final BillingProperties billingProperties;
    private final SubscriptionReceiptRepository receiptRepository;
    private final ObjectMapper objectMapper;

    public ReceiptValidationService(
            BillingProperties billingProperties,
            SubscriptionReceiptRepository receiptRepository,
            ObjectMapper objectMapper
    ) {
        this.billingProperties = billingProperties;
        this.receiptRepository = receiptRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ActivationResult activatePurchase(UUID userId, String store, String productId, String receipt) {
        if (receipt == null || receipt.isBlank()) {
            return ActivationResult.failure("missing_receipt");
        }
        if (productId == null || productId.isBlank()) {
            return ActivationResult.failure("missing_product");
        }

        return verifyAndRecord(userId, normalizeStore(store), productId, receipt);
    }

    @Transactional
    public ActivationResult restorePurchases(UUID userId, String store, String receipt) {
        var prior = receiptRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, STATUS_VALIDATED);
        if (!prior.isEmpty()) {
            SubscriptionReceiptEntity latest = prior.getFirst();
            return ActivationResult.success(new VerifiedReceipt(
                    latest.getStore(),
                    latest.getProductId(),
                    latest.getTransactionId()
            ));
        }

        if (receipt == null || receipt.isBlank()) {
            return ActivationResult.failure("no_prior_receipt");
        }

        return verifyAndRecord(userId, normalizeStore(store), "premium_monthly", receipt);
    }

    private ActivationResult verifyAndRecord(UUID userId, String store, String productId, String receipt) {
        VerifiedReceipt verified;
        try {
            verified = verifyWithStore(store, productId, receipt);
        } catch (IllegalStateException ex) {
            return ActivationResult.failure(ex.getMessage());
        }

        Optional<SubscriptionReceiptEntity> existing = receiptRepository
                .findByStoreAndTransactionId(verified.store(), verified.transactionId());
        if (existing.isPresent()) {
            SubscriptionReceiptEntity record = existing.get();
            if (!record.getUserId().equals(userId)) {
                return ActivationResult.failure("receipt_already_claimed");
            }
            return ActivationResult.success(verified);
        }

        SubscriptionReceiptEntity created = new SubscriptionReceiptEntity();
        created.setUserId(userId);
        created.setStore(verified.store());
        created.setProductId(verified.productId());
        created.setTransactionId(verified.transactionId());
        created.setStatus(STATUS_VALIDATED);
        created.setRawPayload(toPayload(receipt));
        try {
            receiptRepository.saveAndFlush(created);
        } catch (DataIntegrityViolationException ex) {
            SubscriptionReceiptEntity raced = receiptRepository
                    .findByStoreAndTransactionId(verified.store(), verified.transactionId())
                    .orElseThrow(() -> ex);
            if (!raced.getUserId().equals(userId)) {
                return ActivationResult.failure("receipt_already_claimed");
            }
        }

        return ActivationResult.success(verified);
    }

    private VerifiedReceipt verifyWithStore(String store, String productId, String receipt) {
        return switch (store) {
            case "mock" -> verifyMockReceipt(productId, receipt);
            case "app_store" -> verifyAppStoreReceipt(productId, receipt);
            case "play_store" -> verifyPlayStoreReceipt(productId, receipt);
            default -> throw new IllegalStateException("unsupported_store");
        };
    }

    private VerifiedReceipt verifyMockReceipt(String productId, String receipt) {
        if (!billingProperties.isAllowMockReceipts()) {
            throw new IllegalStateException("mock_receipts_disabled");
        }
        if (!billingProperties.getMockReceiptToken().equals(receipt)) {
            throw new IllegalStateException("invalid_receipt");
        }
        String transactionId = "mock-" + digest(receipt + ":" + productId);
        return new VerifiedReceipt("mock", productId, transactionId);
    }

    private VerifiedReceipt verifyAppStoreReceipt(String productId, String receipt) {
        if (billingProperties.getAppleSharedSecret() == null
                || billingProperties.getAppleSharedSecret().isBlank()) {
            throw new IllegalStateException("app_store_not_configured");
        }
        // Production path: call Apple's verifyReceipt endpoint and derive transactionId from the response.
        throw new IllegalStateException("app_store_verification_not_implemented");
    }

    private VerifiedReceipt verifyPlayStoreReceipt(String productId, String receipt) {
        if (billingProperties.getGooglePlayPackageName() == null
                || billingProperties.getGooglePlayPackageName().isBlank()) {
            throw new IllegalStateException("play_store_not_configured");
        }
        // Production path: call Google Play Developer API and derive transactionId from purchase token.
        throw new IllegalStateException("play_store_verification_not_implemented");
    }

    static String normalizeStore(String storeOrPlatform) {
        if (storeOrPlatform == null || storeOrPlatform.isBlank()) {
            return "app_store";
        }
        return switch (storeOrPlatform.toLowerCase(Locale.ROOT)) {
            case "mock" -> "mock";
            case "ios", "app_store", "apple" -> "app_store";
            case "android", "play_store", "google" -> "play_store";
            default -> storeOrPlatform.toLowerCase(Locale.ROOT);
        };
    }

    private String toPayload(String receipt) {
        try {
            return objectMapper.writeValueAsString(Map.of("receiptLength", receipt.length()));
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    private static String digest(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash, 0, 8);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
