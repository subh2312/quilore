package com.quilore.security;

/**
 * Coarse permissions mapped onto roles.
 */
public enum Permission {
    READ_OWN_DATA,
    READ_SUPPORT_TOOLS,
    MANAGE_CONTENT,
    MANAGE_USERS,
    MANAGE_ROLES;

    public boolean allowedFor(UserRole role) {
        return switch (this) {
            case READ_OWN_DATA -> true;
            case READ_SUPPORT_TOOLS -> role == UserRole.SUPPORT || role == UserRole.ADMIN;
            case MANAGE_CONTENT, MANAGE_USERS, MANAGE_ROLES -> role == UserRole.ADMIN;
        };
    }
}
