package com.quilore.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

/**
 * MinIO media metadata helper (Story: Deploy MinIO for media metadata storage).
 * Object bytes live in MinIO; Spring Boot stores metadata references only.
 */
@Component
public class MinioMediaService {

    private final String endpoint;
    private final String bucket;

    public MinioMediaService(
            @Value("${minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${minio.bucket:quilore-media}") String bucket
    ) {
        this.endpoint = endpoint;
        this.bucket = bucket;
    }

    public Map<String, Object> registerObject(UUID userId, String objectKey, String contentType, byte[] bytes) {
        String checksum = sha256(bytes);
        String key = objectKey == null || objectKey.isBlank()
                ? "users/" + userId + "/" + UUID.randomUUID()
                : objectKey;
        return Map.of(
                "bucket", bucket,
                "objectKey", key,
                "endpoint", endpoint,
                "contentType", contentType == null ? "application/octet-stream" : contentType,
                "sizeBytes", bytes == null ? 0 : bytes.length,
                "checksumSha256", checksum,
                "url", endpoint.replaceAll("/$", "") + "/" + bucket + "/" + key
        );
    }

    public String bucket() {
        return bucket;
    }

    public String endpoint() {
        return endpoint;
    }

    private static String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes == null ? new byte[0] : bytes);
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash media object", ex);
        }
    }
}
