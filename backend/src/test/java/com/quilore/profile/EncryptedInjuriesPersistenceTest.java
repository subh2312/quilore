package com.quilore.profile;

import com.quilore.auth.AuthService;
import com.quilore.security.FieldEncryptor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class EncryptedInjuriesPersistenceTest {

    @Autowired ProfileMetricsService profileMetricsService;
    @Autowired AuthService authService;
    @Autowired FieldEncryptor fieldEncryptor;

    @Test
    void injuriesInfoIsEncryptedAtRestAndRoundTrips() {
        var user = authService.register("enc-" + UUID.randomUUID() + "@quilore.test", "password123", "E");
        profileMetricsService.upsertProfile(user.id(), Map.of(
                "age", 30,
                "sex", "female",
                "heightCm", 165,
                "weightKg", 60,
                "injuriesInfo", "left knee ACL note"
        ));

        String stored = profileMetricsService.rawStoredInjuriesInfo(user.id());
        assertThat(stored).isNotEqualTo("left knee ACL note");
        assertThat(fieldEncryptor.decrypt(stored)).isEqualTo("left knee ACL note");
        assertThat(profileMetricsService.getProfile(user.id()).injuriesInfo())
                .isEqualTo("left knee ACL note");
    }
}
