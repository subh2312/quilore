package com.quilore.prompt;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "prompt_templates", uniqueConstraints = @UniqueConstraint(columnNames = {"key", "version"}))
public class PromptTemplateEntity {

    @Id
    private UUID id;

    @Column(name = "key", nullable = false, length = 120)
    private String key;

    @Column(nullable = false)
    private int version;

    @Column(name = "model_hint", nullable = false, length = 120)
    private String modelHint = "default";

    @Column(nullable = false, length = 8000)
    private String body;

    @Column(nullable = false)
    private boolean active = false;

    @Column(name = "created_by", nullable = false, length = 120)
    private String createdBy;

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
        if (modelHint == null) {
            modelHint = "default";
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getModelHint() { return modelHint; }
    public void setModelHint(String modelHint) { this.modelHint = modelHint; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
