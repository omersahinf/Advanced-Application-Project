package com.demo.ecommerce.security;

/**
 * Simple principal object stored in SecurityContext after JWT validation.
 * Carries the user ID so controllers can scope data access.
 */
public class UserPrincipal {
    private final Long userId;
    private final String email;
    private final String role;

    public UserPrincipal(Long userId, String email, String role) {
        this.userId = userId;
        this.email = email;
        this.role = role;
    }

    public Long getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
}
