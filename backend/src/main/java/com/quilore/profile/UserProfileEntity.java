package com.quilore.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
public class UserProfileEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    private Integer age;

    @Column(length = 32)
    private String sex;

    @Column(name = "height_cm")
    private Double heightCm;

    @Column(name = "weight_kg")
    private Double weightKg;

    @Column(name = "training_experience", length = 64)
    private String trainingExperience;

    @Column(name = "dietary_preferences", length = 2000)
    private String dietaryPreferences;

    @Column(name = "injuries_info", length = 2000)
    private String injuriesInfo;

    @Column(name = "equipment_access", length = 2000)
    private String equipmentAccess;

    @Column(name = "injuries_disclaimer", nullable = false, length = 256)
    private String injuriesDisclaimer = ProfileMetricsService.INJURY_DISCLAIMER;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
        if (injuriesDisclaimer == null || injuriesDisclaimer.isBlank()) {
            injuriesDisclaimer = ProfileMetricsService.INJURY_DISCLAIMER;
        }
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getSex() {
        return sex;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }

    public Double getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(Double heightCm) {
        this.heightCm = heightCm;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public String getTrainingExperience() {
        return trainingExperience;
    }

    public void setTrainingExperience(String trainingExperience) {
        this.trainingExperience = trainingExperience;
    }

    public String getDietaryPreferences() {
        return dietaryPreferences;
    }

    public void setDietaryPreferences(String dietaryPreferences) {
        this.dietaryPreferences = dietaryPreferences;
    }

    public String getInjuriesInfo() {
        return injuriesInfo;
    }

    public void setInjuriesInfo(String injuriesInfo) {
        this.injuriesInfo = injuriesInfo;
    }

    public String getEquipmentAccess() {
        return equipmentAccess;
    }

    public void setEquipmentAccess(String equipmentAccess) {
        this.equipmentAccess = equipmentAccess;
    }

    public String getInjuriesDisclaimer() {
        return injuriesDisclaimer;
    }

    public void setInjuriesDisclaimer(String injuriesDisclaimer) {
        this.injuriesDisclaimer = injuriesDisclaimer;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
