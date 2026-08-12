package com.quilore.security;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Fail-closed startup validation for JWT and field-encryption secrets (B1/B4).
 * Insecure defaults are allowed only when {@code quilore.security.allow-insecure-defaults=true}
 * (explicit test/dev). Staging/production must supply strong secrets.
 */
@Component
public class SecuritySecretsValidator {

    private static final int MIN_JWT_SECRET_BYTES = 32;

    private final SecurityProperties properties;

    public SecuritySecretsValidator(SecurityProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void validate() {
        validateJwtSecret(properties.getJwtSecret(), properties.isAllowInsecureDefaults());
        validateEncryptionKey(properties.getDataEncryptionKey(), properties.isAllowInsecureDefaults());
    }

    public static void validateJwtSecret(String secret, boolean allowInsecureDefaults) {
        if (secret == null || secret.isBlank()) {
            if (allowInsecureDefaults) {
                return;
            }
            throw new IllegalStateException(
                    "JWT_SECRET is required outside allow-insecure-defaults profiles");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_JWT_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least " + MIN_JWT_SECRET_BYTES + " bytes");
        }
        if (!allowInsecureDefaults && isWeakJwtSecret(secret)) {
            throw new IllegalStateException("JWT_SECRET is weak or uses a known placeholder value");
        }
    }

    public static void validateEncryptionKey(String base64Key, boolean allowInsecureDefaults) {
        if (base64Key == null || base64Key.isBlank()) {
            if (allowInsecureDefaults) {
                return;
            }
            throw new IllegalStateException(
                    "DATA_ENCRYPTION_KEY is required outside allow-insecure-defaults profiles");
        }
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("DATA_ENCRYPTION_KEY must be valid base64", ex);
        }
        if (raw.length != 32) {
            throw new IllegalStateException("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes");
        }
        if (!allowInsecureDefaults && isAllZero(raw)) {
            throw new IllegalStateException("DATA_ENCRYPTION_KEY must not be an all-zero key");
        }
    }

    private static boolean isWeakJwtSecret(String secret) {
        String normalized = secret.trim().toLowerCase();
        return normalized.contains("change-me")
                || normalized.contains("dev-only")
                || normalized.equals("test-only-jwt-secret-must-be-32chars");
    }

    private static boolean isAllZero(byte[] raw) {
        for (byte b : raw) {
            if (b != 0) {
                return false;
            }
        }
        return true;
    }
}
