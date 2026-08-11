package com.quilore.notify;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/meal-reminders")
public class MealReminderController {

    private final MealReminderService service;

    public MealReminderController(MealReminderService service) {
        this.service = service;
    }

    @PostMapping("/{userId}/prefs")
    public ResponseEntity<?> prefs(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var prefs = service.savePrefs(
                owner,
                Boolean.TRUE.equals(body.get("enabled")),
                ((Number) body.getOrDefault("windowStartMinute", 480)).intValue(),
                ((Number) body.getOrDefault("windowEndMinute", 1260)).intValue(),
                body.get("privacyMode") == null || Boolean.TRUE.equals(body.get("privacyMode"))
        );
        return ResponseEntity.ok(Map.of(
                "userId", prefs.userId().toString(),
                "enabled", prefs.enabled(),
                "privacyMode", prefs.privacyMode()
        ));
    }

    @PostMapping("/{userId}/meal-logged")
    public ResponseEntity<?> mealLogged(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        service.recordMealLog(owner);
        return ResponseEntity.ok(Map.of("recorded", true));
    }

    @PostMapping("/{userId}/tick")
    public ResponseEntity<?> tick(@PathVariable UUID userId, @RequestBody(required = false) Map<String, String> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        LocalTime now = body != null && body.get("now") != null ? LocalTime.parse(body.get("now")) : LocalTime.now();
        return ResponseEntity.ok(service.maybeSendReminder(owner, now));
    }
}
