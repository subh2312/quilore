package com.quilore.sync;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SyncUserStateRepository extends JpaRepository<SyncUserStateEntity, UUID> {
}
