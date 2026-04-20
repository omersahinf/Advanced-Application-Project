package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.*;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.repository.UserRepository;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.AuthService;
import com.demo.ecommerce.service.UserManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
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

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    public AuthController(AuthService authService, UserRepository userRepository,
                          UserManagementService userManagementService) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.userManagementService = userManagementService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password", description = "Sets JWT cookies and returns user info")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                                HttpServletResponse httpResponse) {
        LoginResponse lr = authService.login(request);
        addJwtCookie(httpResponse, "jwt_token", lr.getToken(), 86400);       // 1 day
        addJwtCookie(httpResponse, "jwt_refresh", lr.getRefreshToken(), 604800); // 7 days
        // Strip tokens from response body — cookies are the transport
        return ResponseEntity.ok(lr.withoutTokens());
    }

    @PostMapping("/register")
    @Operation(summary = "Register as individual user")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userManagementService.registerIndividual(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token (reads jwt_refresh cookie)")
    public ResponseEntity<LoginResponse> refresh(@RequestBody(required = false) RefreshRequest bodyRequest,
                                                  HttpServletRequest httpRequest,
                                                  HttpServletResponse httpResponse) {
        // 1) Prefer refresh token from HttpOnly cookie
        String refreshToken = null;
        if (httpRequest.getCookies() != null) {
            for (Cookie c : httpRequest.getCookies()) {
                if ("jwt_refresh".equals(c.getName())) {
                    refreshToken = c.getValue();
                    break;
                }
            }
        }
        // 2) Fallback: body (for API / Swagger clients)
        if ((refreshToken == null || refreshToken.isEmpty()) && bodyRequest != null) {
            refreshToken = bodyRequest.getRefreshToken();
        }
        if (refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken(refreshToken);
        LoginResponse lr = authService.refresh(req);
        addJwtCookie(httpResponse, "jwt_token", lr.getToken(), 86400);
        addJwtCookie(httpResponse, "jwt_refresh", lr.getRefreshToken(), 604800);
        return ResponseEntity.ok(lr.withoutTokens());
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
    public ResponseEntity<?> logout(HttpServletResponse httpResponse) {
        // Clear HttpOnly cookies
        addJwtCookie(httpResponse, "jwt_token", "", 0);
        addJwtCookie(httpResponse, "jwt_refresh", "", 0);
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

    // ── HttpOnly cookie helper ──────────────────────────────────────
    private void addJwtCookie(HttpServletResponse resp, String name, String value, int maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)   // controlled via app.cookie.secure property
                .sameSite("Strict")
                .path("/")
                .maxAge(maxAge)
                .build();
        resp.addHeader("Set-Cookie", cookie.toString());
    }
}
