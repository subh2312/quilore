package com.quilore.observability;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Redacts sensitive keys/values from telemetry payloads per logging policy.
 */
public final class SensitiveDataRedactor {

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password",
            "passwd",
            "secret",
            "token",
            "api_key",
            "apikey",
            "authorization",
            "jwt",
            "refresh_token",
            "access_token",
            "credit_card",
            "ssn"
    );

    private static final Pattern BEARER = Pattern.compile("(?i)(bearer\\s+)[a-z0-9._\\-]+");
    private static final String REDACTED = "[REDACTED]";

    private SensitiveDataRedactor() {
    }

    public static String redactText(String input) {
        if (input == null || input.isBlank()) {
            return input;
        }
        return BEARER.matcher(input).replaceAll("$1" + REDACTED);
    }

    public static Map<String, Object> redactMap(Map<String, ?> input) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (input == null) {
            return out;
        }
        for (Map.Entry<String, ?> entry : input.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            if (isSensitiveKey(key)) {
                out.put(key, REDACTED);
            } else if (value instanceof Map<?, ?> nested) {
                @SuppressWarnings("unchecked")
                Map<String, ?> typed = (Map<String, ?>) nested;
                out.put(key, redactMap(typed));
            } else if (value instanceof String s) {
                out.put(key, redactText(s));
            } else {
                out.put(key, value);
            }
        }
        return out;
    }

    public static boolean isSensitiveKey(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.toLowerCase(Locale.ROOT).replace('-', '_');
        if (SENSITIVE_KEYS.contains(normalized)) {
            return true;
        }
        return normalized.contains("password")
                || normalized.contains("secret")
                || normalized.contains("token")
                || normalized.contains("api_key");
    }
}
