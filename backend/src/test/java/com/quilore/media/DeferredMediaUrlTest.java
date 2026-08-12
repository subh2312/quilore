package com.quilore.media;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * F2: deferred MinIO mode must never expose a constructed endpoint/bucket/key URL.
 */
@SpringBootTest
class DeferredMediaUrlTest {

    @Autowired MinioMediaService minioMediaService;

    @Test
    void deferredRegisterAndMetadataReturnNullUrl() {
        assertThat(minioMediaService.isEnabled()).isFalse();

        UUID userId = UUID.randomUUID();
        Map<String, Object> registered = minioMediaService.registerObject(
                userId,
                null,
                "text/plain",
                "hello".getBytes(StandardCharsets.UTF_8)
        );

        assertThat(registered.get("status")).isEqualTo("deferred");
        assertThat(registered.get("uploadAvailable")).isEqualTo(false);
        assertThat(registered.get("url")).isNull();
        assertThat(registered.get("objectKey").toString()).startsWith("users/" + userId + "/");
        assertThat(registered.get("bucket")).isNotNull();
        assertThat(registered.get("checksumSha256")).isNotNull();
        assertThat(registered.get("sizeBytes")).isEqualTo(5L);

        UUID mediaId = UUID.fromString(registered.get("id").toString());
        Map<String, Object> metadata = minioMediaService.getMetadata(mediaId);
        assertThat(metadata.get("status")).isEqualTo("deferred");
        assertThat(metadata.get("uploadAvailable")).isEqualTo(false);
        assertThat(metadata.get("url")).isNull();
        assertThat(metadata.get("objectKey")).isEqualTo(registered.get("objectKey"));
        assertThat(String.valueOf(metadata.get("url"))).doesNotContain("http");
    }
}
