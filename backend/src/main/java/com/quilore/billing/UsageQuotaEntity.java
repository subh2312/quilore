package com.quilore.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.UUID;

@Entity
@Table(name = "usage_quotas", uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "feature_key"}))
public class UsageQuotaEntity {

    @Id
    private UUID id;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(name = "feature_key", nullable = false, length = 120)
    private String featureKey;

    @Column(name = "limit_count", nullable = false)
    private int limitCount;

    @Column(nullable = false, length = 32)
    private String period = "MONTHLY";

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (period == null) {
            period = "MONTHLY";
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPlanId() { return planId; }
    public void setPlanId(UUID planId) { this.planId = planId; }
    public String getFeatureKey() { return featureKey; }
    public void setFeatureKey(String featureKey) { this.featureKey = featureKey; }
    public int getLimitCount() { return limitCount; }
    public void setLimitCount(int limitCount) { this.limitCount = limitCount; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
}
