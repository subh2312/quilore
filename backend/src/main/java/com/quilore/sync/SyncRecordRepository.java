package com.quilore.sync;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SyncRecordRepository extends JpaRepository<SyncRecordEntity, UUID> {
    List<SyncRecordEntity> findByUserIdAndUpdatedAtEpochMsGreaterThan(UUID userId, long updatedAtEpochMs);
    Optional<SyncRecordEntity> findByUserIdAndCollectionAndRecordId(UUID userId, String collection, String recordId);
}
