package com.quilore.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Resolves the authenticated principal. Identity always comes from SecurityContext,
 * never from client-controlled request fields (B1/B2).
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return authentication;
    }

    public static UUID requireUserId() {
        Authentication authentication = requireAuthentication();
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            try {
                return UUID.fromString(jwt.getSubject());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
            }
        }
        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticated principal must be a user id");
        }
    }

    public static String requireRole() {
        Authentication authentication = requireAuthentication();
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .findFirst()
                .orElse("USER");
    }

    public static boolean hasRole(String role) {
        Authentication authentication = requireAuthentication();
        String expected = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(expected));
    }

    /**
     * Ensures the path/body userId matches the authenticated principal (or caller is ADMIN).
     */
    public static UUID requireSelfOrAdmin(UUID requestedUserId) {
        UUID principalId = requireUserId();
        if (requestedUserId.equals(principalId) || hasRole("ADMIN")) {
            return requestedUserId;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access to another user's data is denied");
    }
}
