package com.quilore.notify;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "meal_reminder_prefs")
public class MealReminderPrefsEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private boolean enabled = false;

    @Column(name = "window_start_minute", nullable = false)
    private int windowStartMinute = 480;

    @Column(name = "window_end_minute", nullable = false)
    private int windowEndMinute = 1260;

    @Column(name = "privacy_mode", nullable = false)
    private boolean privacyMode = true;

    @Column(name = "last_meal_log_at")
    private Instant lastMealLogAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public int getWindowStartMinute() { return windowStartMinute; }
    public void setWindowStartMinute(int windowStartMinute) { this.windowStartMinute = windowStartMinute; }
    public int getWindowEndMinute() { return windowEndMinute; }
    public void setWindowEndMinute(int windowEndMinute) { this.windowEndMinute = windowEndMinute; }
    public boolean isPrivacyMode() { return privacyMode; }
    public void setPrivacyMode(boolean privacyMode) { this.privacyMode = privacyMode; }
    public Instant getLastMealLogAt() { return lastMealLogAt; }
    public void setLastMealLogAt(Instant lastMealLogAt) { this.lastMealLogAt = lastMealLogAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
