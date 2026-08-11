package com.quilore.media;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MediaObjectRepository extends JpaRepository<MediaObjectEntity, UUID> {
    Optional<MediaObjectEntity> findByBucketAndObjectKey(String bucket, String objectKey);
}
