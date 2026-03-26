package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateOrderRequest;
import com.demo.ecommerce.dto.OrderDto;
import com.demo.ecommerce.entity.*;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.exception.UnauthorizedOperationException;
import com.demo.ecommerce.repository.*;
import lombok.extern.slf4j.Slf4j;
import static com.demo.ecommerce.entity.OrderStatus.*;
import static com.demo.ecommerce.entity.ShipmentStatus.*;
import static com.demo.ecommerce.entity.StoreStatus.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OrderService {

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
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CREDIT_CARD");
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
            if (status != OrderStatus.CANCELLED) {
                throw new BadRequestException("Individual users can only cancel orders");
            }
        }

        order.setStatus(status);
        log.info("Order status updated: id={}, status={}, by userId={}", orderId, status, actorUserId);
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
