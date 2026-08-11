package com.quilore.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FieldEncryptorTest {

    @Test
    void roundTripsSensitivePayload() {
        String key = java.util.Base64.getEncoder().encodeToString(new byte[32]);
        FieldEncryptor encryptor = new FieldEncryptor(key);
        String encrypted = encryptor.encrypt("injury note: left knee");
        assertThat(encrypted).isNotEqualTo("injury note: left knee");
        assertThat(encryptor.decrypt(encrypted)).isEqualTo("injury note: left knee");
    }

    @Test
    void producesDifferentCiphertextEachCall() {
        String key = java.util.Base64.getEncoder().encodeToString(new byte[32]);
        FieldEncryptor encryptor = new FieldEncryptor(key);
        assertThat(encryptor.encrypt("same")).isNotEqualTo(encryptor.encrypt("same"));
    }
}
