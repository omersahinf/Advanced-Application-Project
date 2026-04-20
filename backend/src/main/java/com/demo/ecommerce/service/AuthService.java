package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.LoginRequest;
import com.demo.ecommerce.dto.LoginResponse;
import com.demo.ecommerce.dto.RefreshRequest;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.AuthenticationException;
import com.demo.ecommerce.repository.UserRepository;
import com.demo.ecommerce.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest request) {
        String email = request.getEmail();
        // Allow short usernames: "user1" → "user1@example.com"
        if (!email.contains("@")) {
            email = email + "@example.com";
        }

        final String resolvedEmail = email;
        User user = userRepository.findByEmail(resolvedEmail)
                .orElseThrow(() -> new AuthenticationException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed login attempt for email: {}", resolvedEmail);
            throw new AuthenticationException("Invalid email or password");
        }

        if (user.isSuspended()) {
            log.warn("Suspended user login attempt: {}", request.getEmail());
            throw new AuthenticationException("Account is suspended. Contact administrator.");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail(), user.getRole());
        log.info("User logged in: {} (role={})", user.getEmail(), user.getRole());
        return new LoginResponse(token, refreshToken, user.getEmail(), user.getRole(), user.getCompanyName(), user.getFirstName());
    }

    public LoginResponse refresh(RefreshRequest request) {
        try {
            Claims claims = jwtUtil.parseToken(request.getRefreshToken());
            String type = claims.get("type", String.class);
            if (!"refresh".equals(type)) {
                throw new AuthenticationException("Invalid refresh token");
            }

            Long userId = jwtUtil.getUserId(claims);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AuthenticationException("User not found"));

            String newToken = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
            String newRefreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail(), user.getRole());
            return new LoginResponse(newToken, newRefreshToken, user.getEmail(), user.getRole(), user.getCompanyName(), user.getFirstName());
        } catch (AuthenticationException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Refresh token validation failed: {}", e.getMessage());
            throw new AuthenticationException("Invalid or expired refresh token");
        }
    }
}
