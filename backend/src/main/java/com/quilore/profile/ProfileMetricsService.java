package com.quilore.profile;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProfileMetricsService {

    public static final String INJURY_DISCLAIMER =
            "Informational only — not a medical diagnosis.";

    public record Profile(
            UUID userId,
            Integer age,
            String sex,
            Double heightCm,
            Double weightKg,
            String trainingExperience,
            String dietaryPreferences,
            String injuriesInfo,
            String equipmentAccess,
            String injuriesDisclaimer,
            java.time.Instant updatedAt
    ) {}

    public record BodyMetric(UUID id, UUID userId, LocalDate recordedOn, Double weightKg, Double waistCm,
                             String photoObjectKey) {}

    public record CheckIn(UUID id, UUID userId, LocalDate recordedOn, Integer mood, Integer recovery,
                          Integer hunger, Integer energy, String notes) {}

    private final UserProfileRepository profileRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final CheckInRepository checkInRepository;

    public ProfileMetricsService(
            UserProfileRepository profileRepository,
            BodyMetricRepository bodyMetricRepository,
            CheckInRepository checkInRepository
    ) {
        this.profileRepository = profileRepository;
        this.bodyMetricRepository = bodyMetricRepository;
        this.checkInRepository = checkInRepository;
    }

    @Transactional
    public Profile upsertProfile(UUID userId, Map<String, Object> body) {
        require(body, "age", "sex", "heightCm", "weightKg");
        UserProfileEntity entity = profileRepository.findById(userId).orElseGet(UserProfileEntity::new);
        entity.setUserId(userId);
        entity.setAge(((Number) body.get("age")).intValue());
        entity.setSex(String.valueOf(body.get("sex")));
        entity.setHeightCm(((Number) body.get("heightCm")).doubleValue());
        entity.setWeightKg(((Number) body.get("weightKg")).doubleValue());
        entity.setTrainingExperience(String.valueOf(body.getOrDefault("trainingExperience", "")));
        entity.setDietaryPreferences(String.valueOf(body.getOrDefault("dietaryPreferences", "")));
        entity.setInjuriesInfo(String.valueOf(body.getOrDefault("injuriesInfo", "")));
        entity.setEquipmentAccess(String.valueOf(body.getOrDefault("equipmentAccess", "")));
        entity.setInjuriesDisclaimer(INJURY_DISCLAIMER);
        return toProfile(profileRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public Profile getProfile(UUID userId) {
        return profileRepository.findById(userId)
                .map(this::toProfile)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }

    @Transactional
    public BodyMetric logMetric(UUID userId, LocalDate date, Double weightKg, Double waistCm, String photoKey) {
        BodyMetricEntity entity = new BodyMetricEntity();
        entity.setUserId(userId);
        entity.setRecordedOn(date);
        entity.setWeightKg(weightKg);
        entity.setWaistCm(waistCm);
        entity.setPhotoObjectKey(photoKey);
        BodyMetricEntity saved = bodyMetricRepository.save(entity);
        return new BodyMetric(saved.getId(), saved.getUserId(), saved.getRecordedOn(),
                saved.getWeightKg(), saved.getWaistCm(), saved.getPhotoObjectKey());
    }

    @Transactional
    public CheckIn logCheckIn(UUID userId, LocalDate date, Integer mood, Integer recovery,
                              Integer hunger, Integer energy, String notes) {
        validateMarker(mood);
        validateMarker(recovery);
        validateMarker(hunger);
        validateMarker(energy);
        CheckInEntity entity = new CheckInEntity();
        entity.setUserId(userId);
        entity.setRecordedOn(date);
        entity.setMood(mood);
        entity.setRecovery(recovery);
        entity.setHunger(hunger);
        entity.setEnergy(energy);
        entity.setNotes(notes);
        CheckInEntity saved = checkInRepository.save(entity);
        return new CheckIn(saved.getId(), saved.getUserId(), saved.getRecordedOn(), saved.getMood(),
                saved.getRecovery(), saved.getHunger(), saved.getEnergy(), saved.getNotes());
    }

    @Transactional(readOnly = true)
    public List<BodyMetric> metricsBetween(UUID userId, LocalDate from, LocalDate to) {
        return bodyMetricRepository.findByUserIdAndRecordedOnBetweenOrderByRecordedOnAsc(userId, from, to).stream()
                .map(m -> new BodyMetric(m.getId(), m.getUserId(), m.getRecordedOn(),
                        m.getWeightKg(), m.getWaistCm(), m.getPhotoObjectKey()))
                .toList();
    }

    private Profile toProfile(UserProfileEntity entity) {
        return new Profile(
                entity.getUserId(),
                entity.getAge(),
                entity.getSex(),
                entity.getHeightCm(),
                entity.getWeightKg(),
                entity.getTrainingExperience(),
                entity.getDietaryPreferences(),
                entity.getInjuriesInfo(),
                entity.getEquipmentAccess(),
                entity.getInjuriesDisclaimer(),
                entity.getUpdatedAt()
        );
    }

    private static void require(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            if (body.get(key) == null || String.valueOf(body.get(key)).isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required field: " + key);
            }
        }
    }

    private static void validateMarker(Integer value) {
        if (value != null && (value < 1 || value > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Markers must be 1-5");
        }
    }
}
