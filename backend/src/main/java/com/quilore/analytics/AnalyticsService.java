package com.quilore.analytics;

import com.quilore.privacy.PrivacyService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Product analytics event taxonomy with consent gating (Story 9.4).
 */
@Service
public class AnalyticsService {

    public static final Set<String> TAXONOMY = Set.of(
            "onboarding_started",
            "onboarding_completed",
            "goal_set",
            "workout_started",
            "workout_completed",
            "meal_logged",
            "meal_scan_started",
            "chat_message_sent",
            "subscription_started",
            "subscription_restored",
            "injury_triage_viewed",
            "feature_flag_evaluated"
    );

    private static final Set<String> DISALLOWED_PROPS = Set.of(
            "injuryNotes", "rawTranscript", "mealPhotoBase64", "password", "healthDiagnosis"
    );

    public record Event(UUID id, UUID userId, String eventName, Map<String, Object> properties, Instant at) {}

    private final Map<UUID, Event> events = new ConcurrentHashMap<>();
    private final PrivacyService privacyService;

    public AnalyticsService(PrivacyService privacyService) {
        this.privacyService = privacyService;
    }

    public Map<String, Object> taxonomy() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("events", TAXONOMY.stream().sorted().toList());
        out.put("disallowedProperties", DISALLOWED_PROPS.stream().sorted().toList());
        out.put("requiredFields", List.of("eventName", "timestamp", "userId"));
        return out;
    }

    public Map<String, Object> track(UUID userId, String eventName, Map<String, Object> properties) {
        if (!TAXONOMY.contains(eventName)) {
            return Map.of("accepted", false, "reason", "unknown_event", "eventName", eventName);
        }
        var prefs = privacyService.getPrefs(userId);
        if (!prefs.analyticsOptIn()) {
            return Map.of("accepted", false, "reason", "consent_required", "eventName", eventName);
        }
        Map<String, Object> cleaned = new LinkedHashMap<>();
        if (properties != null) {
            properties.forEach((k, v) -> {
                if (!DISALLOWED_PROPS.contains(k)) {
                    cleaned.put(k, v);
                }
            });
        }
        cleaned.put("timestamp", Instant.now().toString());
        Event event = new Event(UUID.randomUUID(), userId, eventName, cleaned, Instant.now());
        events.put(event.id(), event);
        return Map.of(
                "accepted", true,
                "eventId", event.id().toString(),
                "eventName", eventName,
                "properties", cleaned
        );
    }

    public List<Event> recent(UUID userId) {
        List<Event> out = new ArrayList<>();
        for (Event e : events.values()) {
            if (e.userId().equals(userId)) {
                out.add(e);
            }
        }
        return out;
    }
}
