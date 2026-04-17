package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.LoginRequest;
import com.demo.ecommerce.dto.LoginResponse;
import com.demo.ecommerce.entity.RoleType;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.AuthenticationException;
import com.demo.ecommerce.repository.UserRepository;
import com.demo.ecommerce.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setFirstName("John");
        testUser.setLastName("Doe");
        testUser.setEmail("john@example.com");
        testUser.setPasswordHash("$2a$10$hashedpassword");
        testUser.setRoleType(RoleType.INDIVIDUAL);
        testUser.setSuspended(false);
    }

    @Test
    void login_success() {
        LoginRequest req = new LoginRequest();
        req.setEmail("john@example.com");
        req.setPassword("password123");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "$2a$10$hashedpassword")).thenReturn(true);
        when(jwtUtil.generateToken(eq(1L), eq("john@example.com"), eq("INDIVIDUAL"))).thenReturn("jwt-token");
        when(jwtUtil.generateRefreshToken(eq(1L), eq("john@example.com"), eq("INDIVIDUAL"))).thenReturn("refresh-token");

        LoginResponse response = authService.login(req);

        assertNotNull(response);
        assertEquals("jwt-token", response.getToken());
        assertEquals("john@example.com", response.getEmail());
    }

    @Test
    void login_wrongPassword_throws() {
        LoginRequest req = new LoginRequest();
        req.setEmail("john@example.com");
        req.setPassword("wrong");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrong", "$2a$10$hashedpassword")).thenReturn(false);

        assertThrows(AuthenticationException.class, () -> authService.login(req));
    }

    @Test
    void login_userNotFound_throws() {
        LoginRequest req = new LoginRequest();
        req.setEmail("unknown@example.com");
        req.setPassword("password");

        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(AuthenticationException.class, () -> authService.login(req));
    }

    @Test
    void login_suspendedUser_throws() {
        testUser.setSuspended(true);
        LoginRequest req = new LoginRequest();
        req.setEmail("john@example.com");
        req.setPassword("password123");

        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "$2a$10$hashedpassword")).thenReturn(true);

        assertThrows(AuthenticationException.class, () -> authService.login(req));
    }
}
