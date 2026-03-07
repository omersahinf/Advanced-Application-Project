package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.ChatResponse;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.repository.StoreRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiChatService {

    private final InputValidator inputValidator;
    private final ProductService productService;
    private final GeminiService geminiService;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final WebClient chatbotClient;

    @Value("${app.chatbot.enabled:true}")
    private boolean chatbotEnabled;

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

    public ChatResponse chat(String message, Long userId) {
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
                return callPythonChatbot(message, role, userId, user);
            } catch (Exception e) {
                System.err.println("Python chatbot unreachable, using legacy: " + e.getMessage());
            }
        }

        return legacyChat(message, userId, user);
    }

    private ChatResponse callPythonChatbot(String message, String role, Long userId, User user) {
        Map<String, Object> body = new HashMap<>();
        body.put("question", message);
        body.put("user_role", role);
        body.put("user_id", userId.intValue());

        if ("CORPORATE".equals(role)) {
            List<Store> stores = storeRepository.findByOwnerId(userId);
            if (!stores.isEmpty()) {
                body.put("store_id", stores.get(0).getId().intValue());
            }
        }

        Map response = chatbotClient.post()
                .uri("/api/chat")
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(30))
                .block();

        ChatResponse chatResponse = new ChatResponse();
        chatResponse.setAnswer((String) response.get("answer"));
        chatResponse.setRefused(false);
        chatResponse.setSqlQuery((String) response.get("sql_query"));
        chatResponse.setVisualizationHtml((String) response.get("visualization_html"));

        Object data = response.get("data");
        if (data instanceof Map) {
            chatResponse.setData((Map<String, Object>) data);
        }

        return chatResponse;
    }

    private ChatResponse legacyChat(String message, Long userId, User user) {
        List<Product> userProducts = productService.getRawProductsForUser(userId);
        String companyName = user.getCompanyName();
        String answer = geminiService.askAboutProducts(message, userProducts, companyName);
        return new ChatResponse(answer, false);
    }
}
