package com.quilore.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sync_user_state")
public class SyncUserStateEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "last_successful_sync")
    private Instant lastSuccessfulSync;

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public Instant getLastSuccessfulSync() { return lastSuccessfulSync; }
    public void setLastSuccessfulSync(Instant lastSuccessfulSync) { this.lastSuccessfulSync = lastSuccessfulSync; }
}
