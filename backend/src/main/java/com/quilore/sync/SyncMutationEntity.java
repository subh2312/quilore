package com.quilore.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sync_mutations")
public class SyncMutationEntity {

    @Id
    @Column(name = "mutation_id", length = 128)
    private String mutationId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "applied_at", nullable = false)
    private Instant appliedAt;

    @PrePersist
    void onCreate() {
        if (appliedAt == null) {
            appliedAt = Instant.now();
        }
    }

    public String getMutationId() { return mutationId; }
    public void setMutationId(String mutationId) { this.mutationId = mutationId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant appliedAt) { this.appliedAt = appliedAt; }
}
