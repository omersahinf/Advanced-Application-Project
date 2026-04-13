package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.PaymentIntentRequest;
import com.demo.ecommerce.dto.PaymentResponse;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-intent")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<PaymentResponse> createPaymentIntent(
            @Valid @RequestBody PaymentIntentRequest request,
            Authentication auth) {
        Long userId = ((UserPrincipal) auth.getPrincipal()).getUserId();
        return ResponseEntity.ok(paymentService.createPaymentIntent(request.getOrderId(), userId));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<PaymentResponse> confirmPayment(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = ((UserPrincipal) auth.getPrincipal()).getUserId();
        String paymentIntentId = body.get("paymentIntentId");
        return ResponseEntity.ok(paymentService.confirmPayment(paymentIntentId, userId));
    }
}
