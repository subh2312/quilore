package com.quilore.billing;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class EntitlementController {

    private final EntitlementService service;

    public EntitlementController(EntitlementService service) {
        this.service = service;
    }

    @GetMapping("/plans")
    public ResponseEntity<?> catalog() {
        return ResponseEntity.ok(service.catalog().stream().map(p -> Map.of(
                "code", p.code(),
                "name", p.name(),
                "features", p.features(),
                "monthlyQuotas", p.monthlyQuotas()
        )).toList());
    }

    @GetMapping("/entitlements/{userId}")
    public ResponseEntity<?> entitlements(@PathVariable UUID userId) {
        return ResponseEntity.ok(service.entitlementState(userId));
    }

    @PostMapping("/admin/entitlements/{userId}/plan")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assign(@PathVariable UUID userId, @RequestBody Map<String, String> body) {
        service.assignPlan(userId, body.get("planCode"));
        return ResponseEntity.ok(service.entitlementState(userId));
    }

    @PostMapping("/quotas/{userId}/consume")
    public ResponseEntity<?> consume(@PathVariable UUID userId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.consumeQuota(userId, body.get("featureKey")));
    }
}
