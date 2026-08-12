package com.quilore.notify;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Workout reminders with dedupe and privacy-safe copy (Story 10.1).
 */
@Service
public class WorkoutReminderService {

    public record Prefs(UUID userId, boolean enabled, int preferredHour, int preferredMinute,
                        String timezone, String deepLink, boolean privacyMode) {}

    private final Map<UUID, Prefs> prefs = new ConcurrentHashMap<>();
    private final Set<String> sent = ConcurrentHashMap.newKeySet();
    private final AsyncJobNotificationService notifications;

    public WorkoutReminderService(AsyncJobNotificationService notifications) {
        this.notifications = notifications;
    }

    public Prefs savePrefs(UUID userId, boolean enabled, int hour, int minute, String tz,
                           String deepLink, boolean privacyMode) {
        Prefs p = new Prefs(userId, enabled, hour, minute,
                tz == null ? "Asia/Kolkata" : tz,
                deepLink == null ? "quilore://workout" : deepLink,
                privacyMode);
        prefs.put(userId, p);
        return p;
    }

    public Prefs getPrefs(UUID userId) {
        return prefs.get(userId);
    }

    public Map<String, Object> maybeSend(UUID userId, String plannedSessionId, LocalTime now) {
        Prefs p = prefs.get(userId);
        if (p == null || !p.enabled()) {
            return Map.of("sent", false, "reason", "disabled");
        }
        if (now.getHour() != p.preferredHour() || now.getMinute() != p.preferredMinute()) {
            return Map.of("sent", false, "reason", "outside_window");
        }
        String dedupeKey = userId + ":" + plannedSessionId;
        if (!sent.add(dedupeKey)) {
            return Map.of("sent", false, "reason", "duplicate");
        }
        String body = p.privacyMode()
                ? "Time for your scheduled session."
                : "Workout reminder for session " + plannedSessionId;
        var n = new AsyncJobNotificationService.Notification(
                UUID.randomUUID(), userId, "Workout reminder", body, p.deepLink(),
                p.privacyMode(), "SENT", Instant.now()
        );
        notifications.publish(n);
        return Map.of(
                "sent", true,
                "deepLink", p.deepLink(),
                "privacySafe", p.privacyMode(),
                "body", body,
                "deliveryStatus", "SENT"
        );
    }
}
