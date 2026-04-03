package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.*;
import com.demo.ecommerce.entity.OrderStatus;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/store")
public class StoreController {

    private final StoreService storeService;
    private final ProductService productService;
    private final OrderService orderService;
    private final ReviewService reviewService;
    private final DashboardService dashboardService;

    public StoreController(StoreService storeService, ProductService productService,
                           OrderService orderService, ReviewService reviewService,
                           DashboardService dashboardService) {
        this.storeService = storeService;
        this.productService = productService;
        this.orderService = orderService;
        this.reviewService = reviewService;
        this.dashboardService = dashboardService;
    }

    private UserPrincipal getPrincipal(Authentication auth) {
        return (UserPrincipal) auth.getPrincipal();
    }

    // --- My Store ---

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<List<StoreDto>> getMyStores(Authentication auth) {
        return ResponseEntity.ok(storeService.getStoresByOwner(getPrincipal(auth).getUserId()));
    }

    @PostMapping("/my")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<StoreDto> createStore(@Valid @RequestBody CreateStoreRequest request, Authentication auth) {
        return ResponseEntity.ok(storeService.createStore(getPrincipal(auth).getUserId(), request));
    }

    @PutMapping("/my/{storeId}")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<StoreDto> updateStore(@PathVariable Long storeId,
                                                @Valid @RequestBody CreateStoreRequest request,
                                                Authentication auth) {
        return ResponseEntity.ok(storeService.updateStore(storeId, getPrincipal(auth).getUserId(), request));
    }

    // --- My Products ---

    @GetMapping("/my/products")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<List<ProductDto>> getMyProducts(Authentication auth,
                                                          @RequestParam(required = false) String search) {
        Long userId = getPrincipal(auth).getUserId();
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(productService.searchProductsForOwner(userId, search));
        }
        return ResponseEntity.ok(productService.getProductsForOwner(userId));
    }

    @GetMapping("/my/products/{id}")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<ProductDto> getMyProduct(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(productService.getProductForOwner(id, getPrincipal(auth).getUserId()));
    }

    @PostMapping("/my/products")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<ProductDto> createProduct(@Valid @RequestBody CreateProductRequest request, Authentication auth) {
        return ResponseEntity.ok(productService.createProduct(getPrincipal(auth).getUserId(), request));
    }

    @PutMapping("/my/products/{id}")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<ProductDto> updateProduct(@PathVariable Long id,
                                                    @Valid @RequestBody CreateProductRequest request,
                                                    Authentication auth) {
        return ResponseEntity.ok(productService.updateProduct(id, getPrincipal(auth).getUserId(), request));
    }

    @DeleteMapping("/my/products/{id}")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id, Authentication auth) {
        productService.deleteProduct(id, getPrincipal(auth).getUserId());
        return ResponseEntity.noContent().build();
    }

    // --- My Orders (store orders) ---

    @GetMapping("/my/orders")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<List<OrderDto>> getMyStoreOrders(Authentication auth) {
        return ResponseEntity.ok(orderService.getOrdersByStoreOwner(getPrincipal(auth).getUserId()));
    }

    @PatchMapping("/my/orders/{orderId}/status")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<OrderDto> updateOrderStatus(@PathVariable Long orderId,
                                                      @RequestBody java.util.Map<String, String> body,
                                                      Authentication auth) {
        UserPrincipal p = getPrincipal(auth);
        String status = body.get("status");
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, OrderStatus.valueOf(status), p.getUserId(), p.getRole()));
    }

    // --- My Reviews (store product reviews) ---

    @GetMapping("/my/reviews")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<List<ReviewDto>> getMyStoreReviews(Authentication auth) {
        return ResponseEntity.ok(reviewService.getReviewsByStoreOwner(getPrincipal(auth).getUserId()));
    }

    // --- Dashboard ---

    @GetMapping("/my/dashboard")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<DashboardDto.CorporateDashboard> getDashboard(Authentication auth) {
        return ResponseEntity.ok(dashboardService.getCorporateDashboard(getPrincipal(auth).getUserId(), null, null));
    }
}
