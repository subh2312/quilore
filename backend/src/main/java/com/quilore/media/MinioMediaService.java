package com.quilore.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * MinIO media metadata helper (Story: Deploy MinIO for media metadata storage).
 * Object bytes live in MinIO when enabled; Spring Boot always stores metadata references.
 * When {@code minio.enabled=false} (default), uploads are metadata-only with status {@code deferred}.
 */
@Component
public class MinioMediaService {

    private final String endpoint;
    private final String bucket;
    private final boolean enabled;
    private final MediaObjectRepository mediaObjectRepository;

    public MinioMediaService(
            @Value("${minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${minio.bucket:quilore-media}") String bucket,
            @Value("${minio.enabled:false}") boolean enabled,
            MediaObjectRepository mediaObjectRepository
    ) {
        this.endpoint = endpoint;
        this.bucket = bucket;
        this.enabled = enabled;
        this.mediaObjectRepository = mediaObjectRepository;
    }

    @Transactional
    public Map<String, Object> registerObject(UUID userId, String objectKey, String contentType, byte[] bytes) {
        String checksum = sha256(bytes);
        String key = objectKey == null || objectKey.isBlank()
                ? "users/" + userId + "/" + UUID.randomUUID()
                : objectKey;
        long size = bytes == null ? 0 : bytes.length;
        String status = enabled ? "uploaded" : "deferred";

        // Live MinIO client upload is deferred until minio.enabled=true and SDK wiring lands.
        // Do not invent a successful private MinIO upload when disabled.
        if (enabled) {
            throw new UnsupportedOperationException(
                    "Live MinIO upload is not configured in this build; set minio.enabled=false for metadata-only deferred mode"
            );
        }

        MediaObjectEntity entity = mediaObjectRepository.findByBucketAndObjectKey(bucket, key)
                .orElseGet(MediaObjectEntity::new);
        entity.setUserId(userId);
        entity.setBucket(bucket);
        entity.setObjectKey(key);
        entity.setContentType(contentType == null ? "application/octet-stream" : contentType);
        entity.setSizeBytes(size);
        entity.setChecksumSha256(checksum);
        entity.setStatus(status);
        MediaObjectEntity saved = mediaObjectRepository.save(entity);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId().toString());
        result.put("bucket", bucket);
        result.put("objectKey", key);
        result.put("endpoint", endpoint);
        result.put("contentType", saved.getContentType());
        result.put("sizeBytes", size);
        result.put("checksumSha256", checksum);
        result.put("status", status);
        result.put("url", endpoint.replaceAll("/$", "") + "/" + bucket + "/" + key);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMetadata(UUID id) {
        MediaObjectEntity entity = mediaObjectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Media object not found"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", entity.getId().toString());
        result.put("userId", entity.getUserId() == null ? null : entity.getUserId().toString());
        result.put("bucket", entity.getBucket());
        result.put("objectKey", entity.getObjectKey());
        result.put("contentType", entity.getContentType());
        result.put("sizeBytes", entity.getSizeBytes());
        result.put("checksumSha256", entity.getChecksumSha256());
        result.put("status", entity.getStatus());
        result.put("url", endpoint.replaceAll("/$", "") + "/" + entity.getBucket() + "/" + entity.getObjectKey());
        return result;
    }

    public String bucket() {
        return bucket;
    }

    public String endpoint() {
        return endpoint;
    }

    public boolean isEnabled() {
        return enabled;
    }

    private static String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes == null ? new byte[0] : bytes);
            return java.util.HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash media object", ex);
        }
    }
}
