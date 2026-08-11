package com.quilore.controller;

import com.quilore.security.PermissionAuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin-only operations. Normal users must receive 403 without internal detail.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final PermissionAuditService permissionAuditService;

    public AdminController(PermissionAuditService permissionAuditService) {
        this.permissionAuditService = permissionAuditService;
    }

    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> adminHealth(Authentication authentication) {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "scope", "admin",
                "actor", authentication.getName()
        ));
    }

    @PostMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> changeRole(
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {
        String targetUser = body.getOrDefault("userId", "unknown");
        String newRole = body.getOrDefault("role", "USER");
        permissionAuditService.record(
                authentication.getName(),
                "ADMIN",
                "CHANGE_ROLE",
                "target=" + targetUser + " role=" + newRole
        );
        return ResponseEntity.ok(Map.of(
                "accepted", true,
                "userId", targetUser,
                "role", newRole
        ));
    }
}
