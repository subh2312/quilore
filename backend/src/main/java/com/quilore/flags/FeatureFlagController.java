package com.quilore.flags;

import com.quilore.security.CurrentUser;
import com.quilore.security.PermissionAuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class FeatureFlagController {

    private final FeatureFlagService service;
    private final PermissionAuditService audit;

    public FeatureFlagController(FeatureFlagService service, PermissionAuditService audit) {
        this.service = service;
        this.audit = audit;
    }

    @GetMapping("/feature-flags/{userId}")
    public ResponseEntity<?> evaluate(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "production") String environment
    ) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(Map.of(
                "userId", owner.toString(),
                "environment", environment,
                "flags", service.evaluateAll(owner, environment)
        ));
    }

    @GetMapping("/admin/feature-flags")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(service.list().stream().map(service::toMap).toList());
    }

    @PutMapping("/admin/feature-flags/{flagKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable String flagKey,
            @RequestBody Map<String, Object> body,
            Authentication authentication
    ) {
        var existing = service.list().stream().filter(f -> f.key().equals(flagKey)).findFirst()
                .orElse(new FeatureFlagService.Flag(flagKey, flagKey, false, 0, "all"));
        var updated = new FeatureFlagService.Flag(
                flagKey,
                String.valueOf(body.getOrDefault("description", existing.description())),
                Boolean.TRUE.equals(body.getOrDefault("enabledGlobally", existing.enabledGlobally())),
                ((Number) body.getOrDefault("rolloutPercent", existing.rolloutPercent())).intValue(),
                String.valueOf(body.getOrDefault("environment", existing.environment()))
        );
        service.upsert(updated);
        audit.record(authentication.getName(), "ADMIN", "UPDATE_FEATURE_FLAG", "flag=" + flagKey);
        return ResponseEntity.ok(service.toMap(updated));
    }

    @PostMapping("/admin/feature-flags/{flagKey}/cohorts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cohort(
            @PathVariable String flagKey,
            @RequestBody Map<String, Object> body,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(String.valueOf(body.get("userId")));
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        service.setCohort(flagKey, userId, enabled);
        audit.record(authentication.getName(), "ADMIN", "SET_FEATURE_FLAG_COHORT",
                "flag=" + flagKey + " user=" + userId);
        return ResponseEntity.ok(Map.of("flagKey", flagKey, "userId", userId.toString(), "enabled", enabled));
    }
}
