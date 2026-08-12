package com.quilore.privacy;

import com.quilore.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/privacy")
public class PrivacyController {

    private final PrivacyService service;

    public PrivacyController(PrivacyService service) {
        this.service = service;
    }

    @PostMapping("/consents/{userId}")
    public ResponseEntity<?> consent(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var c = service.recordConsent(
                owner,
                String.valueOf(body.get("consentType")),
                String.valueOf(body.getOrDefault("version", "1.0")),
                Boolean.TRUE.equals(body.getOrDefault("accepted", false)),
                String.valueOf(body.getOrDefault("appVersion", "1.0.0"))
        );
        return ResponseEntity.ok(service.consentMap(c));
    }

    @GetMapping("/consents/{userId}")
    public ResponseEntity<?> listConsents(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(service.consentsFor(owner).stream().map(service::consentMap).toList());
    }

    @PutMapping("/preferences/{userId}")
    public ResponseEntity<?> prefs(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var p = service.savePrefs(
                owner,
                Boolean.TRUE.equals(body.getOrDefault("analyticsOptIn", false)),
                Boolean.TRUE.equals(body.getOrDefault("crashReportingOptIn", true)),
                Boolean.TRUE.equals(body.getOrDefault("privacyModeNotifications", true))
        );
        return ResponseEntity.ok(Map.of(
                "userId", p.userId().toString(),
                "analyticsOptIn", p.analyticsOptIn(),
                "crashReportingOptIn", p.crashReportingOptIn(),
                "privacyModeNotifications", p.privacyModeNotifications()
        ));
    }

    @GetMapping("/preferences/{userId}")
    public ResponseEntity<?> getPrefs(@PathVariable UUID userId) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        var p = service.getPrefs(owner);
        return ResponseEntity.ok(Map.of(
                "userId", p.userId().toString(),
                "analyticsOptIn", p.analyticsOptIn(),
                "crashReportingOptIn", p.crashReportingOptIn(),
                "privacyModeNotifications", p.privacyModeNotifications()
        ));
    }

    @PostMapping("/export/{userId}")
    public ResponseEntity<?> export(@PathVariable UUID userId, @RequestBody(required = false) Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        String format = body == null ? "json" : String.valueOf(body.getOrDefault("format", "json"));
        var req = service.requestExport(owner, format);
        return ResponseEntity.accepted().body(Map.of(
                "requestId", req.id().toString(),
                "status", req.status(),
                "format", req.format(),
                "preview", service.buildExportPayload(owner)
        ));
    }

    @PostMapping("/delete-account/{userId}")
    public ResponseEntity<?> deleteAccount(@PathVariable UUID userId, @RequestBody(required = false) Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        String reason = body == null ? "" : String.valueOf(body.getOrDefault("reason", ""));
        var req = service.requestDeletion(owner, reason);
        return ResponseEntity.accepted().body(Map.of(
                "requestId", req.id().toString(),
                "status", req.status(),
                "message", "Deletion queued. Domain records and media will be processed per retention policy."
        ));
    }

    @PostMapping("/notifications/sanitize/{userId}")
    public ResponseEntity<?> sanitize(@PathVariable UUID userId, @RequestBody Map<String, String> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        String out = service.sanitizeNotificationBody(
                owner,
                body.getOrDefault("sensitiveBody", ""),
                body.getOrDefault("safeBody", "You have a new Quilore update.")
        );
        return ResponseEntity.ok(Map.of("body", out, "privacyAware", true));
    }
}
