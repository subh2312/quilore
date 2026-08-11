package com.quilore.controller;

import com.quilore.auth.AuthService;
import com.quilore.security.PermissionAuditService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Admin-only operations. Normal users must receive 403 without internal detail.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Set<String> ALLOWED_ROLES = Set.of("USER", "SUPPORT", "ADMIN");

    private final PermissionAuditService permissionAuditService;
    private final AuthService authService;

    public AdminController(PermissionAuditService permissionAuditService, AuthService authService) {
        this.permissionAuditService = permissionAuditService;
        this.authService = authService;
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
        UUID targetUser;
        try {
            targetUser = UUID.fromString(body.getOrDefault("userId", ""));
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId must be a UUID");
        }
        String newRole = body.getOrDefault("role", "USER").toUpperCase();
        if (!ALLOWED_ROLES.contains(newRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported role");
        }
        var updated = authService.updateRole(targetUser, newRole);
        permissionAuditService.record(
                authentication.getName(),
                "ADMIN",
                "CHANGE_ROLE",
                "target=" + targetUser + " role=" + newRole
        );
        return ResponseEntity.ok(Map.of(
                "accepted", true,
                "userId", updated.id().toString(),
                "role", updated.role()
        ));
    }
}
