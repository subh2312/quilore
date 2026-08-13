package com.quilore.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exercise_revisions", uniqueConstraints = @UniqueConstraint(columnNames = {"exercise_id", "version"}))
public class ExerciseRevisionEntity {

    @Id
    private UUID id;

    @Column(name = "exercise_id", nullable = false)
    private UUID exerciseId;

    @Column(nullable = false)
    private int version;

    /** DB column is JSONB (V3); keep Java as String JSON payload. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String snapshot;

    @Column(nullable = false, length = 120)
    private String actor;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getExerciseId() { return exerciseId; }
    public void setExerciseId(UUID exerciseId) { this.exerciseId = exerciseId; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getSnapshot() { return snapshot; }
    public void setSnapshot(String snapshot) { this.snapshot = snapshot; }
    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }
    public Instant getCreatedAt() { return createdAt; }
}
