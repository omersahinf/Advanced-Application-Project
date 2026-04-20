package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.CreateOrderRequest;
import com.demo.ecommerce.dto.OrderDto;
import com.demo.ecommerce.entity.OrderStatus;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    private UserPrincipal getPrincipal(Authentication auth) {
        return (UserPrincipal) auth.getPrincipal();
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<List<OrderDto>> getMyOrders(Authentication auth,
                                                      @RequestParam(required = false) String status) {
        Long userId = getPrincipal(auth).getUserId();
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(orderService.getOrdersByUserAndStatus(userId, OrderStatus.valueOf(status)));
        }
        return ResponseEntity.ok(orderService.getOrdersByUser(userId));
    }

    @GetMapping("/my/{id}")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<OrderDto> getMyOrder(@PathVariable Long id, Authentication auth) {
        Long userId = getPrincipal(auth).getUserId();
        return ResponseEntity.ok(orderService.getOrderByIdAndUserId(id, userId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<OrderDto> placeOrder(@Valid @RequestBody CreateOrderRequest request, Authentication auth) {
        return ResponseEntity.ok(orderService.placeOrder(getPrincipal(auth).getUserId(), request));
    }

    @PatchMapping("/my/{orderId}/cancel")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<OrderDto> cancelOrder(@PathVariable Long orderId, Authentication auth) {
        UserPrincipal p = getPrincipal(auth);
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED, p.getUserId(), p.getRole()));
    }

    @PatchMapping("/my/{orderId}/return")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<OrderDto> returnOrder(@PathVariable Long orderId, Authentication auth) {
        UserPrincipal p = getPrincipal(auth);
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, OrderStatus.RETURNED, p.getUserId(), p.getRole()));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getAllOrders(@RequestParam(required = false) String status,
                                          @RequestParam(required = false) Integer page,
                                          @RequestParam(required = false, defaultValue = "20") Integer size) {
        if (page != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
            return ResponseEntity.ok(orderService.getAllOrders(pageable));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(orderService.getAllOrders().stream()
                    .filter(o -> status.equalsIgnoreCase(o.getStatus()))
                    .toList());
        }
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PatchMapping("/{orderId}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<OrderDto> adminUpdateStatus(@PathVariable Long orderId, @RequestBody Map<String, String> body,
                                                       Authentication auth) {
        UserPrincipal p = getPrincipal(auth);
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, OrderStatus.valueOf(body.get("status")), p.getUserId(), p.getRole()));
    }
}
