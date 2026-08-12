package com.quilore.sync;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SyncMutationRepository extends JpaRepository<SyncMutationEntity, String> {
}
