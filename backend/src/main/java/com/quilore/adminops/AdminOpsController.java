package com.quilore.adminops;

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
@RequestMapping("/api/admin")
public class AdminOpsController {

    private final AdminOpsService service;
    private final PermissionAuditService audit;

    public AdminOpsController(AdminOpsService service, PermissionAuditService audit) {
        this.service = service;
        this.audit = audit;
    }

    @GetMapping("/food-aliases")
    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public ResponseEntity<?> listAliases() {
        return ResponseEntity.ok(Map.of(
                "pending", service.pendingAliases().stream().map(service::aliasMap).toList(),
                "activeMappings", service.activeAliasMap()
        ));
    }

    @PostMapping("/food-aliases")
    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public ResponseEntity<?> enqueueAlias(@RequestBody Map<String, String> body, Authentication auth) {
        var r = service.enqueueAlias(body.get("rawName"), body.get("candidateCode"));
        audit.record(auth.getName(), "SUPPORT", "ENQUEUE_FOOD_ALIAS", "id=" + r.id());
        return ResponseEntity.ok(service.aliasMap(r));
    }

    @PostMapping("/food-aliases/{id}/decide")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> decideAlias(@PathVariable UUID id, @RequestBody Map<String, String> body,
                                         Authentication auth) {
        var r = service.decideAlias(id, body.getOrDefault("status", "APPROVED"), auth.getName(),
                body.get("notes"), body.get("canonicalCode"));
        audit.record(auth.getName(), "ADMIN", "DECIDE_FOOD_ALIAS", "id=" + id + " status=" + r.status());
        return ResponseEntity.ok(service.aliasMap(r));
    }

    @PostMapping("/food-aliases/{id}/rollback")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rollbackAlias(@PathVariable UUID id, Authentication auth) {
        var r = service.rollbackAlias(id, auth.getName());
        audit.record(auth.getName(), "ADMIN", "ROLLBACK_FOOD_ALIAS", "id=" + id);
        return ResponseEntity.ok(service.aliasMap(r));
    }

    @GetMapping("/meal-scan-reviews")
    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public ResponseEntity<?> listScans() {
        return ResponseEntity.ok(service.pendingScans().stream().map(service::scanMap).toList());
    }

    @PostMapping("/meal-scan-reviews")
    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public ResponseEntity<?> enqueueScan(@RequestBody Map<String, Object> body, Authentication auth) {
        UUID userId = body.get("userId") == null ? null : UUID.fromString(String.valueOf(body.get("userId")));
        UUID mediaId = body.get("mediaObjectId") == null ? null : UUID.fromString(String.valueOf(body.get("mediaObjectId")));
        @SuppressWarnings("unchecked")
        Map<String, Object> model = (Map<String, Object>) body.getOrDefault("modelOutput", Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> correction = (Map<String, Object>) body.get("userCorrection");
        var r = service.enqueueScan(userId, mediaId, model, correction);
        audit.record(auth.getName(), "SUPPORT", "ENQUEUE_MEAL_SCAN_REVIEW", "id=" + r.id());
        return ResponseEntity.ok(service.scanMap(r));
    }

    @PostMapping("/meal-scan-reviews/{id}/decide")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> decideScan(@PathVariable UUID id, @RequestBody Map<String, String> body,
                                        Authentication auth) {
        var r = service.decideScan(id, body.getOrDefault("decision", "ACCEPTED"), auth.getName());
        audit.record(auth.getName(), "ADMIN", "DECIDE_MEAL_SCAN", "id=" + id + " decision=" + r.decision());
        return ResponseEntity.ok(service.scanMap(r));
    }
}
