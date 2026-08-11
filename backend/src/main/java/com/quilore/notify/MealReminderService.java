package com.quilore.notify;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MealReminderService {

    public record Prefs(UUID userId, boolean enabled, int windowStartMinute, int windowEndMinute,
                        boolean privacyMode) {}

    private final Map<UUID, Prefs> prefs = new ConcurrentHashMap<>();
    private final Map<UUID, Instant> lastMealLog = new ConcurrentHashMap<>();
    private final AsyncJobNotificationService notifications;

    public MealReminderService(AsyncJobNotificationService notifications) {
        this.notifications = notifications;
    }

    public Prefs savePrefs(UUID userId, boolean enabled, int start, int end, boolean privacyMode) {
        Prefs p = new Prefs(userId, enabled, start, end, privacyMode);
        prefs.put(userId, p);
        return p;
    }

    public void recordMealLog(UUID userId) {
        lastMealLog.put(userId, Instant.now());
    }

    public Map<String, Object> maybeSendReminder(UUID userId, LocalTime now) {
        Prefs p = prefs.get(userId);
        if (p == null || !p.enabled()) {
            return Map.of("sent", false, "reason", "disabled");
        }
        int minute = now.getHour() * 60 + now.getMinute();
        if (minute < p.windowStartMinute() || minute > p.windowEndMinute()) {
            return Map.of("sent", false, "reason", "outside_window");
        }
        Instant last = lastMealLog.get(userId);
        if (last != null && Instant.now().minusSeconds(3 * 3600).isBefore(last)) {
            return Map.of("sent", false, "reason", "recent_meal_log");
        }
        String body = p.privacyMode()
                ? "Time for your next check-in."
                : "Don't forget to log your meal.";
        var n = new AsyncJobNotificationService.Notification(
                UUID.randomUUID(), userId, "Meal reminder", body, "/nutrition",
                p.privacyMode(), "SENT", Instant.now()
        );
        notifications.publish(n);
        return Map.of(
                "sent", true,
                "deliveryStatus", "SENT",
                "privacySafe", p.privacyMode(),
                "body", body
        );
    }

    public Prefs getPrefs(UUID userId) {
        return prefs.get(userId);
    }
}
