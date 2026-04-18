package com.demo.ecommerce.controller;

import com.demo.ecommerce.config.SecurityConfig;
import com.demo.ecommerce.dto.ChatResponse;
import com.demo.ecommerce.security.JwtFilter;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.security.RateLimitFilter;
import com.demo.ecommerce.service.AiChatService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.context.annotation.Primary;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import reactor.core.publisher.Flux;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AiChatController.class)
@Import({SecurityConfig.class, AiChatControllerTest.TestConfig.class})
class AiChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StubAiChatService aiChatService;

    @BeforeEach
    void resetStub() {
        aiChatService.reset();
    }

    @Test
    void chatRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/chat/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Show revenue\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"error\":\"Unauthorized\"}"));
    }

    @Test
    void chatReturnsMappedResponseForAuthenticatedUser() throws Exception {
        ChatResponse response = new ChatResponse();
        response.setAnswer("Revenue is 100.00");
        response.setRefused(false);
        response.setSqlQuery("SELECT 100.00 AS revenue");
        response.setData(java.util.Map.of(
                "columns", java.util.List.of("revenue"),
                "rows", java.util.List.of(java.util.Map.of("revenue", "100.00")),
                "row_count", 1
        ));

        aiChatService.chatResponse = response;

        mockMvc.perform(post("/api/chat/ask")
                        .with(adminAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Show revenue\",\"sessionId\":\"session-1\"}"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {
                          "answer": "Revenue is 100.00",
                          "refused": false,
                          "sqlQuery": "SELECT 100.00 AS revenue"
                        }
                        """));

        org.junit.jupiter.api.Assertions.assertEquals("Show revenue", aiChatService.lastMessage);
        org.junit.jupiter.api.Assertions.assertEquals(99L, aiChatService.lastUserId);
        org.junit.jupiter.api.Assertions.assertEquals("session-1", aiChatService.lastSessionId);
    }

    @Test
    void chatStreamReturnsServerSentEventsForAuthenticatedUser() throws Exception {
        Flux<ServerSentEvent<String>> stream = Flux.just(
                ServerSentEvent.<String>builder("{\"step\":\"guardrails\"}").event("step").build(),
                ServerSentEvent.<String>builder("{\"step\":\"final\",\"payload\":{\"answer\":\"Done\"}}").event("final").build()
        );

        aiChatService.streamResponse = stream;

        MvcResult result = mockMvc.perform(post("/api/chat/stream")
                        .with(adminAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Stream revenue\",\"sessionId\":\"stream-1\"}"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("event:step")))
                .andExpect(content().string(containsString("event:final")))
                .andExpect(content().string(containsString("\"answer\":\"Done\"")));

        org.junit.jupiter.api.Assertions.assertEquals("Stream revenue", aiChatService.lastMessage);
        org.junit.jupiter.api.Assertions.assertEquals(99L, aiChatService.lastUserId);
        org.junit.jupiter.api.Assertions.assertEquals("stream-1", aiChatService.lastSessionId);
    }

    private RequestPostProcessor adminAuth() {
        TestingAuthenticationToken token = new TestingAuthenticationToken(
                new UserPrincipal(99L, "admin@example.com", "ADMIN"),
                null,
                "ADMIN"
        );
        token.setAuthenticated(true);
        return authentication(token);
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        @Primary
        StubAiChatService aiChatService() {
            return new StubAiChatService();
        }

        @Bean
        JwtFilter jwtFilter() {
            return new PassThroughJwtFilter();
        }

        @Bean
        RateLimitFilter rateLimitFilter() {
            return new PassThroughRateLimitFilter();
        }
    }

    static class StubAiChatService extends AiChatService {
        ChatResponse chatResponse = new ChatResponse();
        Flux<ServerSentEvent<String>> streamResponse = Flux.empty();
        String lastMessage;
        Long lastUserId;
        String lastSessionId;

        StubAiChatService() {
            super(null, null, null, null, null, "http://localhost:8000");
        }

        @Override
        public ChatResponse chat(String message, Long userId, String sessionId) {
            lastMessage = message;
            lastUserId = userId;
            lastSessionId = sessionId;
            return chatResponse;
        }

        @Override
        public Flux<ServerSentEvent<String>> chatStream(String message, Long userId, String sessionId) {
            lastMessage = message;
            lastUserId = userId;
            lastSessionId = sessionId;
            return streamResponse;
        }

        void reset() {
            chatResponse = new ChatResponse();
            streamResponse = Flux.empty();
            lastMessage = null;
            lastUserId = null;
            lastSessionId = null;
        }
    }

    static class PassThroughJwtFilter extends JwtFilter {
        PassThroughJwtFilter() {
            super(null);
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, java.io.IOException {
            filterChain.doFilter(request, response);
        }
    }

    static class PassThroughRateLimitFilter extends RateLimitFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, java.io.IOException {
            filterChain.doFilter(request, response);
        }
    }
}
