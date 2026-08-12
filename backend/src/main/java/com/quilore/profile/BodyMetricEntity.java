package com.quilore.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "body_metrics")
public class BodyMetricEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "recorded_on", nullable = false)
    private LocalDate recordedOn;

    @Column(name = "weight_kg")
    private Double weightKg;

    @Column(name = "waist_cm")
    private Double waistCm;

    @Column(name = "photo_object_key", length = 512)
    private String photoObjectKey;

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

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getRecordedOn() {
        return recordedOn;
    }

    public void setRecordedOn(LocalDate recordedOn) {
        this.recordedOn = recordedOn;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public Double getWaistCm() {
        return waistCm;
    }

    public void setWaistCm(Double waistCm) {
        this.waistCm = waistCm;
    }

    public String getPhotoObjectKey() {
        return photoObjectKey;
    }

    public void setPhotoObjectKey(String photoObjectKey) {
        this.photoObjectKey = photoObjectKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
