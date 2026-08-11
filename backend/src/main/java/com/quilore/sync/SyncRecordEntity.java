package com.quilore.sync;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;

@Entity
@Table(name = "sync_records", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "collection", "record_id"}))
public class SyncRecordEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 120)
    private String collection;

    @Column(name = "record_id", nullable = false, length = 120)
    private String recordId;

    @Column(name = "updated_at_epoch_ms", nullable = false)
    private long updatedAtEpochMs;

    @Column(name = "data_json", nullable = false, length = 8000)
    private String dataJson = "{}";

    @Column(nullable = false)
    private boolean deleted = false;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (dataJson == null) {
            dataJson = "{}";
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getCollection() { return collection; }
    public void setCollection(String collection) { this.collection = collection; }
    public String getRecordId() { return recordId; }
    public void setRecordId(String recordId) { this.recordId = recordId; }
    public long getUpdatedAtEpochMs() { return updatedAtEpochMs; }
    public void setUpdatedAtEpochMs(long updatedAtEpochMs) { this.updatedAtEpochMs = updatedAtEpochMs; }
    public String getDataJson() { return dataJson; }
    public void setDataJson(String dataJson) { this.dataJson = dataJson; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
