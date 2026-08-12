package com.quilore.nutrition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "macro_target_snapshots")
public class MacroTargetSnapshotEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "goal_type", nullable = false, length = 64)
    private String goalType;

    @Column(name = "weight_kg", nullable = false)
    private double weightKg;

    @Column(name = "height_cm", nullable = false)
    private double heightCm;

    @Column(nullable = false)
    private int age;

    @Column(nullable = false, length = 32)
    private String sex;

    @Column(name = "activity_level", nullable = false, length = 64)
    private String activityLevel;

    @Column(name = "target_calories", nullable = false)
    private int targetCalories;

    @Column(name = "target_protein_g", nullable = false)
    private double targetProteinG;

    @Column(name = "target_fat_g", nullable = false)
    private double targetFatG;

    @Column(name = "target_carbs_g", nullable = false)
    private double targetCarbsG;

    @Column(name = "policy_version", nullable = false, length = 64)
    private String policyVersion;

    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (effectiveFrom == null) {
            effectiveFrom = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getGoalType() { return goalType; }
    public void setGoalType(String goalType) { this.goalType = goalType; }
    public double getWeightKg() { return weightKg; }
    public void setWeightKg(double weightKg) { this.weightKg = weightKg; }
    public double getHeightCm() { return heightCm; }
    public void setHeightCm(double heightCm) { this.heightCm = heightCm; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getActivityLevel() { return activityLevel; }
    public void setActivityLevel(String activityLevel) { this.activityLevel = activityLevel; }
    public int getTargetCalories() { return targetCalories; }
    public void setTargetCalories(int targetCalories) { this.targetCalories = targetCalories; }
    public double getTargetProteinG() { return targetProteinG; }
    public void setTargetProteinG(double targetProteinG) { this.targetProteinG = targetProteinG; }
    public double getTargetFatG() { return targetFatG; }
    public void setTargetFatG(double targetFatG) { this.targetFatG = targetFatG; }
    public double getTargetCarbsG() { return targetCarbsG; }
    public void setTargetCarbsG(double targetCarbsG) { this.targetCarbsG = targetCarbsG; }
    public String getPolicyVersion() { return policyVersion; }
    public void setPolicyVersion(String policyVersion) { this.policyVersion = policyVersion; }
    public Instant getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(Instant effectiveFrom) { this.effectiveFrom = effectiveFrom; }
}
