package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.ChatResponse;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.repository.StoreRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final InputValidator inputValidator;
    private final ProductService productService;
    private final GeminiService geminiService;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final WebClient chatbotClient;

    @Value("${app.chatbot.enabled:true}")
    private boolean chatbotEnabled;

    @Value("${app.chatbot.api-key:${CHATBOT_API_KEY:}}")
    private String chatbotApiKey;

    public AiChatService(InputValidator inputValidator, ProductService productService,
                         GeminiService geminiService, UserRepository userRepository,
                         StoreRepository storeRepository,
                         @Value("${app.chatbot.url:http://localhost:8000}") String chatbotUrl) {
        this.inputValidator = inputValidator;
        this.productService = productService;
        this.geminiService = geminiService;
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.chatbotClient = WebClient.builder().baseUrl(chatbotUrl).build();
    }

    public ChatResponse chat(String message, Long userId, String sessionId) {
        InputValidator.ValidationResult validation = inputValidator.validate(message);
        if (!validation.isValid()) {
            return new ChatResponse(validation.getRejectionMessage(), true);
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new ChatResponse("User not found.", true);
        }

        String role = user.getRoleType().name();

        if (chatbotEnabled) {
            try {
                return callPythonChatbot(message, role, userId, user, sessionId);
            } catch (Exception e) {
                log.warn("Python chatbot unreachable, using legacy: {}", e.getMessage());
            }
        }

        return legacyChat(message, userId, user);
    }

    private ChatResponse callPythonChatbot(String message, String role, Long userId, User user, String sessionId) {
        Map<String, Object> body = new HashMap<>();
        body.put("question", message);
        body.put("user_role", role);
        body.put("user_id", userId.intValue());

        if (sessionId != null) {
            body.put("session_id", sessionId);
        }

        if ("CORPORATE".equals(role)) {
            List<Store> stores = storeRepository.findByOwnerId(userId);
            if (!stores.isEmpty()) {
                body.put("store_id", stores.get(0).getId().intValue());
            }
        }

        Map response = chatbotClient.post()
                .uri("/api/chat")
                .header("Content-Type", "application/json")
                .header("X-API-Key", chatbotApiKey)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(60))
                .block();

        ChatResponse chatResponse = new ChatResponse();
        chatResponse.setAnswer((String) response.get("answer"));
        // Check is_in_scope from Python chatbot to set refused flag
        Object isInScope = response.get("is_in_scope");
        Object isGreeting = response.get("is_greeting");
        chatResponse.setRefused(
                isInScope != null
                        && Boolean.FALSE.equals(isInScope)
                        && !Boolean.TRUE.equals(isGreeting)
        );
        chatResponse.setSqlQuery((String) response.get("sql_query"));
        chatResponse.setVisualizationHtml((String) response.get("visualization_html"));

        Object data = response.get("data");
        if (data instanceof Map) {
            chatResponse.setData((Map<String, Object>) data);
        }

        return chatResponse;
    }

    /**
     * Streams per-agent step events from the Python chatbot back to the caller.
     * Returns a Flux of SSE events (with event names "step" or "final").
     */
    public Flux<ServerSentEvent<String>> chatStream(String message, Long userId, String sessionId) {
        InputValidator.ValidationResult validation = inputValidator.validate(message);
        if (!validation.isValid()) {
            String rejected = "{\"step\":\"final\",\"status\":\"done\",\"payload\":{\"answer\":"
                    + jsonString(validation.getRejectionMessage())
                    + ",\"is_in_scope\":false}}";
            return Flux.just(ServerSentEvent.<String>builder(rejected).event("final").build());
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            String err = "{\"step\":\"final\",\"status\":\"error\",\"payload\":{\"answer\":\"User not found.\"}}";
            return Flux.just(ServerSentEvent.<String>builder(err).event("final").build());
        }

        String role = user.getRoleType().name();

        Map<String, Object> body = new HashMap<>();
        body.put("question", message);
        body.put("user_role", role);
        body.put("user_id", userId.intValue());
        if (sessionId != null) body.put("session_id", sessionId);
        if ("CORPORATE".equals(role)) {
            List<Store> stores = storeRepository.findByOwnerId(userId);
            if (!stores.isEmpty()) body.put("store_id", stores.get(0).getId().intValue());
        }

        return chatbotClient.post()
                .uri("/api/chat/stream")
                .header("Content-Type", "application/json")
                .header("X-API-Key", chatbotApiKey)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})
                .timeout(Duration.ofSeconds(120))
                .onErrorResume(ex -> {
                    log.warn("Chatbot stream error: {}", ex.getMessage());
                    String err = "{\"step\":\"final\",\"status\":\"error\",\"payload\":{\"answer\":"
                            + jsonString("Chatbot unreachable: " + ex.getMessage()) + "}}";
                    return Flux.just(ServerSentEvent.<String>builder(err).event("final").build());
                });
    }

    private static String jsonString(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r") + "\"";
    }

    private ChatResponse legacyChat(String message, Long userId, User user) {
        String role = user.getRoleType().name();
        List<Product> userProducts = productService.getRawProductsForUser(userId, role);
        String companyName = user.getCompanyName();
        String answer = geminiService.askAboutProducts(message, userProducts, companyName);
        return new ChatResponse(answer, false);
    }
}
