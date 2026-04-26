package com.demo.ecommerce.integration;

import com.demo.ecommerce.dto.LoginRequest;
import com.demo.ecommerce.dto.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test: Register → Login → Access protected endpoint → RBAC enforcement.
 * Uses H2 in-memory database with auto-configured schema.
 */
@SpringBootTest(properties = {
    "spring.profiles.active=h2",
    "app.jwt.secret=integration-test-secret-key-must-be-at-least-64-characters-long-for-hs512-algorithm",
    "app.chatbot.enabled=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("h2")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private static Cookie jwtCookie;
    private static Cookie refreshCookie;

    @Test
    @Order(1)
    void register_individual_success() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFirstName("Integration");
        req.setLastName("Tester");
        req.setEmail("integration@test.com");
        req.setPassword("Test123!");
        req.setGender("OTHER");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("integration@test.com"))
                .andExpect(jsonPath("$.role").value("INDIVIDUAL"));
    }

    @Test
    @Order(2)
    void register_duplicate_email_fails() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setFirstName("Duplicate");
        req.setLastName("User");
        req.setEmail("integration@test.com");
        req.setPassword("Test123!");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Email already in use"));
    }

    @Test
    @Order(3)
    void login_success_returns_jwt() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("integration@test.com");
        req.setPassword("Test123!");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("jwt_token"))
                .andExpect(cookie().exists("jwt_refresh"))
                .andExpect(jsonPath("$.role").value("INDIVIDUAL"))
                .andReturn();

        jwtCookie = result.getResponse().getCookie("jwt_token");
        refreshCookie = result.getResponse().getCookie("jwt_refresh");
        assertNotNull(jwtCookie);
        assertNotNull(refreshCookie);
    }

    @Test
    @Order(4)
    void login_wrong_password_returns_401() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("integration@test.com");
        req.setPassword("WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(5)
    void protected_endpoint_with_token_succeeds() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .cookie(jwtCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("integration@test.com"));
    }

    @Test
    @Order(6)
    void protected_endpoint_without_token_returns_401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(7)
    void individual_cannot_access_admin_endpoint() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .cookie(jwtCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(8)
    void refresh_token_returns_new_tokens() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .cookie(refreshCookie)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("jwt_token"))
                .andExpect(cookie().exists("jwt_refresh"));
    }

    @Test
    @Order(9)
    void products_endpoint_accessible_when_authenticated() throws Exception {
        mockMvc.perform(get("/api/products")
                .cookie(jwtCookie))
                .andExpect(status().isOk());
    }

    @Test
    @Order(10)
    void invalid_token_returns_401() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }
}
