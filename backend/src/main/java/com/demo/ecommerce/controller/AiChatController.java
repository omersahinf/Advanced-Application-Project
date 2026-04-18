package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.ChatRequest;
import com.demo.ecommerce.dto.ChatResponse;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.AiChatService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
public class AiChatController {

    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    /**
     * SECURITY: AI chat endpoint.
     * - Requires authentication (JWT)
     * - Input is validated for injection attempts
     * - Only the authenticated user's product data is used
     * - Gemini API key stays on backend
     */
    @PostMapping({"/api/chat/ask", "/api/ai/chat"})
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication) {

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        ChatResponse response = aiChatService.chat(request.getMessage(), principal.getUserId(), request.getSessionId());
        return ResponseEntity.ok(response);
    }

    /**
     * Streaming variant: forwards per-agent step events from the Python chatbot as Server-Sent Events.
     * Used by the frontend to render a live execution timeline (PDF 5.1: "streams execution process").
     */
    @PostMapping(value = {"/api/chat/stream", "/api/ai/chat/stream"},
                 produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> chatStream(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return aiChatService.chatStream(request.getMessage(), principal.getUserId(), request.getSessionId());
    }
}
