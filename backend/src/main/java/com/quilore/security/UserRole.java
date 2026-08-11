package com.quilore.security;

/**
 * Application roles for Quilore RBAC (Story 15.1).
 */
public enum UserRole {
    USER,
    SUPPORT,
    ADMIN;

    public String springRole() {
        return "ROLE_" + name();
    }
}
