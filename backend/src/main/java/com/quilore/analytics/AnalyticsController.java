package com.quilore.analytics;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService service;

    public AnalyticsController(AnalyticsService service) {
        this.service = service;
    }

    @GetMapping("/taxonomy")
    public ResponseEntity<?> taxonomy() {
        CurrentUser.requireAuthentication();
        return ResponseEntity.ok(service.taxonomy());
    }

    @PostMapping("/events/{userId}")
    public ResponseEntity<?> track(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        @SuppressWarnings("unchecked")
        Map<String, Object> props = (Map<String, Object>) body.getOrDefault("properties", Map.of());
        return ResponseEntity.ok(service.track(owner, String.valueOf(body.get("eventName")), props));
    }
}
