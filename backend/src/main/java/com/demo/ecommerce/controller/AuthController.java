package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.*;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.repository.UserRepository;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.AuthService;
import com.demo.ecommerce.service.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Login, register, and token refresh endpoints")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final UserManagementService userManagementService;

    public AuthController(AuthService authService, UserRepository userRepository,
                          UserManagementService userManagementService) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.userManagementService = userManagementService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password", description = "Returns JWT access and refresh tokens")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @Operation(summary = "Register as individual user")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userManagementService.registerIndividual(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PutMapping("/profile")
    @Operation(summary = "Update current user's profile")
    public ResponseEntity<UserDto> updateProfile(Authentication authentication,
                                                   @RequestBody UpdateProfileRequest request) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(userManagementService.updateProfile(principal.getUserId(), request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout and invalidate token")
    public ResponseEntity<?> logout() {
        // In a stateless JWT setup, the client discards the token.
        // Server-side blacklisting can be added with Redis for production.
        return ResponseEntity.ok(java.util.Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user info")
    public ResponseEntity<UserInfoDto> me(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String companyName = userRepository.findById(principal.getUserId())
                .map(User::getCompanyName)
                .orElse(null);
        return ResponseEntity.ok(new UserInfoDto(
                principal.getUserId(),
                principal.getEmail(),
                principal.getRole(),
                companyName
        ));
    }
}
