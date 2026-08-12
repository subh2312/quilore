package com.quilore.media;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * MinIO media metadata helper.
 * <p>
 * When {@code minio.enabled=false} (default), uploads are <strong>deferred</strong>:
 * metadata is persisted, but no object bytes are uploaded and no usable URL is returned.
 * Live MinIO upload, ownership-checked retrieval, and short-lived presigned URLs remain a follow-up.
 * When eventually enabled: generate user-owned key prefixes, upload successfully before
 * metadata finalization, enforce ownership, and return authorized presigned URLs only.
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
        // Always keep user-owned key prefix when a client-supplied key is used.
        if (!key.startsWith("users/" + userId + "/")) {
            key = "users/" + userId + "/" + key.replaceAll("^/+", "");
        }
        long size = bytes == null ? 0 : bytes.length;
        String status = enabled ? "uploaded" : "deferred";

        // Live MinIO client upload is deferred until minio.enabled=true and SDK wiring lands.
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

        return toResponse(saved, false);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMetadata(UUID id) {
        MediaObjectEntity entity = mediaObjectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Media object not found"));
        boolean deferred = !"uploaded".equalsIgnoreCase(entity.getStatus());
        return toResponse(entity, deferred);
    }

    private Map<String, Object> toResponse(MediaObjectEntity entity, boolean forceDeferred) {
        boolean deferred = forceDeferred || "deferred".equalsIgnoreCase(entity.getStatus()) || !enabled;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", entity.getId().toString());
        if (entity.getUserId() != null) {
            result.put("userId", entity.getUserId().toString());
        }
        result.put("bucket", entity.getBucket());
        result.put("objectKey", entity.getObjectKey());
        result.put("endpoint", endpoint);
        result.put("contentType", entity.getContentType());
        result.put("sizeBytes", entity.getSizeBytes());
        result.put("checksumSha256", entity.getChecksumSha256());
        result.put("status", deferred ? "deferred" : entity.getStatus());
        result.put("uploadAvailable", !deferred && enabled);
        // Never return a constructed endpoint/bucket/key as a usable retrieval URL while deferred.
        result.put("url", null);
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
