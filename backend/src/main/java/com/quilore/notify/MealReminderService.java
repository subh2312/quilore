package com.quilore.notify;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;

@Service
public class MealReminderService {

    public record Prefs(UUID userId, boolean enabled, int windowStartMinute, int windowEndMinute,
                        boolean privacyMode) {}

    private final MealReminderPrefsRepository prefsRepository;
    private final AsyncJobNotificationService notifications;

    public MealReminderService(
            MealReminderPrefsRepository prefsRepository,
            AsyncJobNotificationService notifications
    ) {
        this.prefsRepository = prefsRepository;
        this.notifications = notifications;
    }

    @Transactional
    public Prefs savePrefs(UUID userId, boolean enabled, int start, int end, boolean privacyMode) {
        MealReminderPrefsEntity entity = prefsRepository.findById(userId).orElseGet(MealReminderPrefsEntity::new);
        entity.setUserId(userId);
        entity.setEnabled(enabled);
        entity.setWindowStartMinute(start);
        entity.setWindowEndMinute(end);
        entity.setPrivacyMode(privacyMode);
        MealReminderPrefsEntity saved = prefsRepository.save(entity);
        return toPrefs(saved);
    }

    @Transactional
    public void recordMealLog(UUID userId) {
        MealReminderPrefsEntity entity = prefsRepository.findById(userId).orElseGet(MealReminderPrefsEntity::new);
        entity.setUserId(userId);
        entity.setLastMealLogAt(Instant.now());
        prefsRepository.save(entity);
    }

    @Transactional
    public Map<String, Object> maybeSendReminder(UUID userId, LocalTime now) {
        MealReminderPrefsEntity entity = prefsRepository.findById(userId).orElse(null);
        if (entity == null || !entity.isEnabled()) {
            return Map.of("sent", false, "reason", "disabled");
        }
        int minute = now.getHour() * 60 + now.getMinute();
        if (minute < entity.getWindowStartMinute() || minute > entity.getWindowEndMinute()) {
            return Map.of("sent", false, "reason", "outside_window");
        }
        Instant last = entity.getLastMealLogAt();
        if (last != null && Instant.now().minusSeconds(3 * 3600).isBefore(last)) {
            return Map.of("sent", false, "reason", "recent_meal_log");
        }
        String body = entity.isPrivacyMode()
                ? "Time for your next check-in."
                : "Don't forget to log your meal.";
        var n = new AsyncJobNotificationService.Notification(
                UUID.randomUUID(), userId, "Meal reminder", body, "/nutrition",
                entity.isPrivacyMode(), "SENT", Instant.now()
        );
        notifications.publish(n);
        return Map.of(
                "sent", true,
                "deliveryStatus", "SENT",
                "privacySafe", entity.isPrivacyMode(),
                "body", body
        );
    }

    @Transactional(readOnly = true)
    public Prefs getPrefs(UUID userId) {
        return prefsRepository.findById(userId).map(this::toPrefs).orElse(null);
    }

    private Prefs toPrefs(MealReminderPrefsEntity entity) {
        return new Prefs(
                entity.getUserId(),
                entity.isEnabled(),
                entity.getWindowStartMinute(),
                entity.getWindowEndMinute(),
                entity.isPrivacyMode()
        );
    }
}
