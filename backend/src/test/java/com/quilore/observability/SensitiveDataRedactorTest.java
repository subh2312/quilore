package com.quilore.observability;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataRedactorTest {

    @Test
    void redactsSensitiveKeysAndBearerTokens() {
        Map<String, Object> redacted = SensitiveDataRedactor.redactMap(Map.of(
                "username", "athlete",
                "password", "hunter2",
                "authorization", "Bearer abc.def.ghi",
                "note", "Bearer abc.def.ghi should vanish"
        ));

        assertThat(redacted.get("username")).isEqualTo("athlete");
        assertThat(redacted.get("password")).isEqualTo("[REDACTED]");
        assertThat(redacted.get("authorization")).isEqualTo("[REDACTED]");
        assertThat(redacted.get("note").toString()).contains("[REDACTED]");
        assertThat(redacted.get("note").toString()).doesNotContain("abc.def.ghi");
    }
}
