package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateOrderRequest;
import com.demo.ecommerce.dto.OrderDto;
import com.demo.ecommerce.entity.*;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.exception.UnauthorizedOperationException;
import com.demo.ecommerce.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import static com.demo.ecommerce.entity.OrderStatus.*;
import static com.demo.ecommerce.entity.ShipmentStatus.*;
import static com.demo.ecommerce.entity.StoreStatus.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import com.stripe.exception.StripeException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final ShipmentRepository shipmentRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository,
                        StoreRepository storeRepository, UserRepository userRepository,
                        ShipmentRepository shipmentRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.shipmentRepository = shipmentRepository;
    }

    public List<OrderDto> getOrdersByUser(Long userId) {
        return orderRepository.findByUserId(userId).stream()
                .map(OrderDto::from)
                .collect(Collectors.toList());
    }

    public List<OrderDto> getOrdersByUserAndStatus(Long userId, OrderStatus status) {
        return orderRepository.findByUserIdAndStatus(userId, status).stream()
                .map(OrderDto::from)
                .collect(Collectors.toList());
    }

    public List<OrderDto> getOrdersByStore(Long storeId) {
        return orderRepository.findByStoreId(storeId).stream()
                .map(OrderDto::from)
                .collect(Collectors.toList());
    }

    public List<OrderDto> getOrdersByStoreOwner(Long ownerId) {
        return orderRepository.findByStoreOwnerId(ownerId).stream()
                .map(OrderDto::from)
                .collect(Collectors.toList());
    }

    public List<OrderDto> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(OrderDto::from)
                .collect(Collectors.toList());
    }

    public Page<OrderDto> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable).map(OrderDto::from);
    }

    public OrderDto getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return OrderDto.from(order);
    }

    public OrderDto getOrderByIdAndUserId(Long id, Long userId) {
        Order order = orderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return OrderDto.from(order);
    }

    @Transactional
    public OrderDto placeOrder(Long userId, CreateOrderRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Store store = storeRepository.findById(req.getStoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));

        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw new BadRequestException("Store is not active");
        }

        Order order = new Order();
        order.setUser(user);
        order.setStore(store);
        String paymentMethod = req.getPaymentMethod() != null ? req.getPaymentMethod() : "CREDIT_CARD";
        // STRIPE is a processor, not a method — store as CREDIT_CARD for consistency
        if ("STRIPE".equalsIgnoreCase(paymentMethod)) {
            paymentMethod = "CREDIT_CARD";
        }
        // All orders start as PENDING — store owner must confirm (fulfillment workflow)
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(paymentMethod);
        order.setSalesChannel("WEB");
        order.setFulfilment("WAREHOUSE");

        BigDecimal grandTotal = BigDecimal.ZERO;

        for (CreateOrderRequest.ItemRequest itemReq : req.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + itemReq.getProductId()));

            if (!product.getStore().getId().equals(store.getId())) {
                throw new BadRequestException("Product " + product.getName() + " does not belong to this store");
            }

            if (product.getStock() < itemReq.getQuantity()) {
                throw new BadRequestException("Insufficient stock for " + product.getName());
            }

            product.setStock(product.getStock() - itemReq.getQuantity());

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemReq.getQuantity());
            item.setPrice(product.getUnitPrice());
            order.getOrderItems().add(item);

            grandTotal = grandTotal.add(
                    product.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()))
            );
        }

        order.setGrandTotal(grandTotal);
        Order saved = orderRepository.save(order);
        log.info("Order placed: id={}, userId={}, storeId={}, total={}", saved.getId(), userId, req.getStoreId(), grandTotal);
        return OrderDto.from(saved);
    }

    @Transactional
    public OrderDto updateOrderStatus(Long orderId, OrderStatus status, Long actorUserId, String actorRole) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if ("ADMIN".equals(actorRole)) {
            // admin can update any
        } else if ("CORPORATE".equals(actorRole)) {
            if (!order.getStore().getOwner().getId().equals(actorUserId)) {
                throw new UnauthorizedOperationException("Not authorized to update this order");
            }
        } else {
            if (!order.getUser().getId().equals(actorUserId)) {
                throw new UnauthorizedOperationException("Not authorized to update this order");
            }
            if (status != OrderStatus.CANCELLED && status != OrderStatus.RETURNED) {
                throw new BadRequestException("Individual users can only cancel or return orders");
            }
            if (status == OrderStatus.CANCELLED) {
                OrderStatus current = order.getStatus();
                if (current != OrderStatus.PENDING) {
                    throw new BadRequestException("Only pending orders can be cancelled");
                }
            }
            if (status == OrderStatus.RETURNED) {
                OrderStatus current = order.getStatus();
                if (current != OrderStatus.CONFIRMED
                        && current != OrderStatus.SHIPPED
                        && current != OrderStatus.DELIVERED) {
                    throw new BadRequestException("Only confirmed, shipped or delivered orders can be returned");
                }
            }
        }

        order.setStatus(status);
        log.info("Order status updated: id={}, status={}, by userId={}", orderId, status, actorUserId);

        // Stripe refund when cancelling or returning a paid order
        if ((status == OrderStatus.CANCELLED || status == OrderStatus.RETURNED)
                && order.getStripePaymentIntentId() != null) {
            try {
                RefundCreateParams params = RefundCreateParams.builder()
                        .setPaymentIntent(order.getStripePaymentIntentId())
                        .build();
                Refund refund = Refund.create(params);
                log.info("Stripe refund issued: refundId={}, orderId={}, amount={}",
                        refund.getId(), orderId, refund.getAmount());
            } catch (StripeException e) {
                log.error("Stripe refund failed for orderId={}: {}", orderId, e.getMessage());
                // Don't block cancellation — order is still cancelled even if refund fails
            } catch (Exception e) {
                log.error("Unexpected error during refund for orderId={}", orderId, e);
                // Don't block status update
            }
        }

        Order saved = orderRepository.save(order);

        // Auto-create shipment when order transitions to SHIPPED
        if (status == OrderStatus.SHIPPED && shipmentRepository.findByOrderId(orderId).isEmpty()) {
            Shipment shipment = new Shipment();
            shipment.setOrder(saved);
            shipment.setStatus(ShipmentStatus.IN_TRANSIT);
            shipment.setTrackingNumber("TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            shipment.setCarrier("FedEx");
            shipment.setWarehouse("Block A");
            shipment.setMode("Road");
            shipment.setShippedDate(LocalDateTime.now());
            shipment.setEstimatedArrival(LocalDateTime.now().plusDays(5));
            shipment.setCustomerCareCalls(0);
            Shipment savedShipment = shipmentRepository.save(shipment);
            saved.setShipment(savedShipment);
        }

        // Auto-update shipment when order is DELIVERED
        if (status == OrderStatus.DELIVERED) {
            shipmentRepository.findByOrderId(orderId).ifPresent(shipment -> {
                shipment.setStatus(ShipmentStatus.DELIVERED);
                shipment.setDeliveredDate(LocalDateTime.now());
                shipmentRepository.save(shipment);
                saved.setShipment(shipment);
            });
        }

        return OrderDto.from(saved);
    }
}
