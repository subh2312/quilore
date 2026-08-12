package com.quilore.notify;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications/workout-reminders")
public class WorkoutReminderController {

    private final WorkoutReminderService service;

    public WorkoutReminderController(WorkoutReminderService service) {
        this.service = service;
    }

    @PutMapping("/{userId}/prefs")
    public ResponseEntity<?> prefs(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var p = service.savePrefs(
                owner,
                Boolean.TRUE.equals(body.getOrDefault("enabled", true)),
                ((Number) body.getOrDefault("preferredHour", 7)).intValue(),
                ((Number) body.getOrDefault("preferredMinute", 0)).intValue(),
                String.valueOf(body.getOrDefault("timezone", "Asia/Kolkata")),
                String.valueOf(body.getOrDefault("deepLink", "quilore://workout")),
                Boolean.TRUE.equals(body.getOrDefault("privacyMode", true))
        );
        return ResponseEntity.ok(Map.of(
                "userId", p.userId().toString(),
                "enabled", p.enabled(),
                "preferredHour", p.preferredHour(),
                "preferredMinute", p.preferredMinute(),
                "timezone", p.timezone(),
                "deepLink", p.deepLink(),
                "privacyMode", p.privacyMode()
        ));
    }

    @GetMapping("/{userId}/prefs")
    public ResponseEntity<?> get(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var p = service.getPrefs(owner);
        if (p == null) {
            return ResponseEntity.ok(Map.of("enabled", false));
        }
        return ResponseEntity.ok(Map.of(
                "userId", p.userId().toString(),
                "enabled", p.enabled(),
                "preferredHour", p.preferredHour(),
                "preferredMinute", p.preferredMinute(),
                "timezone", p.timezone(),
                "deepLink", p.deepLink(),
                "privacyMode", p.privacyMode()
        ));
    }

    @PostMapping("/{userId}/trigger")
    public ResponseEntity<?> trigger(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        LocalTime now = body.containsKey("hour")
                ? LocalTime.of(((Number) body.get("hour")).intValue(), ((Number) body.getOrDefault("minute", 0)).intValue())
                : LocalTime.now();
        return ResponseEntity.ok(service.maybeSend(owner, String.valueOf(body.getOrDefault("plannedSessionId", "default")), now));
    }
}
