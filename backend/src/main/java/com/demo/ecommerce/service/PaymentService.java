package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.PaymentResponse;
import com.demo.ecommerce.entity.Order;
import com.demo.ecommerce.entity.OrderStatus;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.OrderRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final OrderRepository orderRepository;

    @Value("${app.stripe.publishable-key:}")
    private String publishableKey;

    public PaymentService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional
    public PaymentResponse createPaymentIntent(Long orderId, Long userId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("Only PENDING orders can be paid. Current status: " + order.getStatus());
        }

        if (order.getStripePaymentIntentId() != null) {
            throw new BadRequestException("Payment already initiated for this order");
        }

        try {
            // Stripe uses cents, so multiply by 100
            long amountInCents = order.getGrandTotal()
                    .multiply(java.math.BigDecimal.valueOf(100))
                    .longValue();

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("usd")
                    .setDescription("Order #" + order.getId() + " - E-Commerce Analytics Platform")
                    .putMetadata("orderId", order.getId().toString())
                    .putMetadata("userId", userId.toString())
                    .addPaymentMethodType("card")
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            order.setStripePaymentIntentId(intent.getId());
            order.setPaymentMethod("STRIPE");
            orderRepository.save(order);

            log.info("PaymentIntent created: intentId={}, orderId={}, amount={}", intent.getId(), orderId, amountInCents);

            return new PaymentResponse(
                    intent.getClientSecret(),
                    intent.getId(),
                    publishableKey,
                    intent.getStatus(),
                    orderId
            );
        } catch (StripeException e) {
            log.error("Stripe error creating PaymentIntent for orderId={}: {}", orderId, e.getMessage());
            throw new BadRequestException("Payment processing error: " + e.getMessage());
        }
    }

    @Transactional
    public PaymentResponse confirmPayment(String paymentIntentId, Long userId) {
        Order order = orderRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found for payment"));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Unauthorized payment confirmation");
        }

        try {
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            String status = intent.getStatus();

            if ("succeeded".equals(status)) {
                // Payment received — order stays PENDING until store owner confirms
                orderRepository.save(order);
                log.info("Payment succeeded (order stays PENDING for store confirmation): intentId={}, orderId={}", paymentIntentId, order.getId());
            } else if ("requires_payment_method".equals(status) || "requires_action".equals(status)) {
                log.info("Payment still pending: intentId={}, status={}", paymentIntentId, status);
            } else if ("canceled".equals(status)) {
                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.save(order);
                log.info("Payment canceled: intentId={}, orderId={}", paymentIntentId, order.getId());
            }

            return new PaymentResponse(
                    intent.getClientSecret(),
                    intent.getId(),
                    publishableKey,
                    status,
                    order.getId()
            );
        } catch (StripeException e) {
            log.error("Stripe error confirming payment: {}", e.getMessage());
            throw new BadRequestException("Payment confirmation error: " + e.getMessage());
        }
    }
}
