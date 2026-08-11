package com.quilore.security;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FieldEncryptorTest {

    @Test
    void roundTripsSensitivePayloadWithRandomKey() {
        byte[] raw = new byte[32];
        for (int i = 0; i < raw.length; i++) {
            raw[i] = (byte) (i + 1);
        }
        SecurityProperties props = props(Base64.getEncoder().encodeToString(raw), false);
        FieldEncryptor encryptor = new FieldEncryptor(props);
        assertThat(encryptor.isEncryptionActive()).isTrue();
        String encrypted = encryptor.encrypt("injury note: left knee");
        assertThat(encrypted).isNotEqualTo("injury note: left knee");
        assertThat(encryptor.decrypt(encrypted)).isEqualTo("injury note: left knee");
    }

    @Test
    void producesDifferentCiphertextEachCall() {
        byte[] raw = new byte[32];
        raw[0] = 7;
        FieldEncryptor encryptor = new FieldEncryptor(props(Base64.getEncoder().encodeToString(raw), true));
        assertThat(encryptor.encrypt("same")).isNotEqualTo(encryptor.encrypt("same"));
    }

    @Test
    void stagingLikeMissingOrAllZeroKeyFailsClosed() {
        assertThatThrownBy(() -> SecuritySecretsValidator.validateEncryptionKey("", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DATA_ENCRYPTION_KEY");
        String allZero = Base64.getEncoder().encodeToString(new byte[32]);
        assertThatThrownBy(() -> SecuritySecretsValidator.validateEncryptionKey(allZero, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("all-zero");
        assertThatThrownBy(() -> new FieldEncryptor(props(allZero, false)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void allowInsecureDefaultsPermitsBlankKeyForTestsOnly() {
        FieldEncryptor encryptor = new FieldEncryptor(props("", true));
        assertThat(encryptor.isEncryptionActive()).isFalse();
        assertThat(encryptor.decrypt(encryptor.encrypt("x"))).isEqualTo("x");
    }

    private static SecurityProperties props(String key, boolean allowInsecure) {
        SecurityProperties properties = new SecurityProperties();
        properties.setDataEncryptionKey(key);
        properties.setAllowInsecureDefaults(allowInsecure);
        properties.setJwtSecret("test-only-jwt-secret-must-be-32chars");
        return properties;
    }
}
