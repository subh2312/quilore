package com.quilore.billing;

import com.quilore.security.CurrentUser;
import com.quilore.security.PermissionAuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    private final ReceiptValidationService receiptValidationService;
    private final PermissionAuditService permissionAuditService;

    public EntitlementController(
            EntitlementService service,
            ReceiptValidationService receiptValidationService,
            PermissionAuditService permissionAuditService
    ) {
        this.service = service;
        this.receiptValidationService = receiptValidationService;
        this.permissionAuditService = permissionAuditService;
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
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(service.entitlementState(owner));
    }

    @PostMapping("/admin/entitlements/{userId}/plan")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assign(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        service.assignPlan(userId, body.get("planCode"));
        permissionAuditService.record(
                authentication.getName(),
                "ADMIN",
                "ASSIGN_PLAN",
                "target=" + userId + " plan=" + body.get("planCode")
        );
        return ResponseEntity.ok(service.entitlementState(userId));
    }

    @PostMapping("/billing/{userId}/purchase")
    public ResponseEntity<?> purchase(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        String productId = stringValue(body.get("productId"), "premium_monthly");
        String store = resolveStore(body);
        String receipt = stringValue(body.get("receipt"), "");

        ReceiptValidationService.ActivationResult result = receiptValidationService
                .activatePurchase(owner, store, productId, receipt);
        if (!result.activated()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "activated", false,
                    "reason", result.reason(),
                    "entitlements", service.entitlementState(owner)
            ));
        }

        service.assignPlan(owner, "PREMIUM");
        return ResponseEntity.ok(Map.of(
                "activated", true,
                "store", result.store(),
                "productId", result.productId(),
                "transactionId", result.transactionId(),
                "entitlements", service.entitlementState(owner)
        ));
    }

    @PostMapping("/billing/{userId}/restore")
    public ResponseEntity<?> restore(@PathVariable UUID userId, @RequestBody Map<String, Object> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        String store = resolveStore(body);
        String receipt = stringValue(body.get("receipt"), "");

        ReceiptValidationService.ActivationResult result = receiptValidationService
                .restorePurchases(owner, store, receipt);
        if (!result.activated()) {
            return ResponseEntity.ok(Map.of(
                    "restored", false,
                    "reason", result.reason(),
                    "entitlements", service.entitlementState(owner)
            ));
        }

        service.assignPlan(owner, "PREMIUM");
        return ResponseEntity.ok(Map.of(
                "restored", true,
                "transactionId", result.transactionId(),
                "entitlements", service.entitlementState(owner)
        ));
    }

    @PostMapping("/quotas/{userId}/consume")
    public ResponseEntity<?> consume(@PathVariable UUID userId, @RequestBody Map<String, String> body) {
        UUID owner = CurrentUser.requireSelfOrAdmin(userId);
        return ResponseEntity.ok(service.consumeQuota(owner, body.get("featureKey")));
    }

    private static String resolveStore(Map<String, Object> body) {
        String platform = stringValue(body.get("platform"), "");
        if (!platform.isBlank()) {
            return platform;
        }
        return stringValue(body.get("store"), "app_store");
    }

    private static String stringValue(Object value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String text = String.valueOf(value);
        return text.isBlank() ? defaultValue : text;
    }
}
