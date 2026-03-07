package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.ChatRequest;
import com.demo.ecommerce.dto.ChatResponse;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.AiChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
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
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            Authentication authentication) {

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        ChatResponse response = aiChatService.chat(request.getMessage(), principal.getUserId());
        return ResponseEntity.ok(response);
    }
}
