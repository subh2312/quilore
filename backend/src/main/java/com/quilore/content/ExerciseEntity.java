package com.quilore.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exercises")
public class ExerciseEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 8000)
    private String instructions = "";

    @Column(name = "coaching_cues", nullable = false, length = 8000)
    private String coachingCues = "";

    @Column(name = "demo_asset_url", length = 512)
    private String demoAssetUrl;

    @Column(nullable = false)
    private boolean published = false;

    @Column(nullable = false)
    private int version = 1;

    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (instructions == null) {
            instructions = "";
        }
        if (coachingCues == null) {
            coachingCues = "";
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
    public String getCoachingCues() { return coachingCues; }
    public void setCoachingCues(String coachingCues) { this.coachingCues = coachingCues; }
    public String getDemoAssetUrl() { return demoAssetUrl; }
    public void setDemoAssetUrl(String demoAssetUrl) { this.demoAssetUrl = demoAssetUrl; }
    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
