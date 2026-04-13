package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.AddToCartRequest;
import com.demo.ecommerce.dto.CartDto;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.CartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@PreAuthorize("hasAuthority('INDIVIDUAL')")
@Tag(name = "Shopping Cart", description = "Cart management for individual users")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @Operation(summary = "Get current user's cart")
    public ResponseEntity<CartDto> getCart(Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(cartService.getCart(p.getUserId()));
    }

    @PostMapping
    @Operation(summary = "Add product to cart")
    public ResponseEntity<CartDto> addToCart(Authentication auth, @Valid @RequestBody AddToCartRequest request) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(cartService.addToCart(p.getUserId(), request));
    }

    @PatchMapping("/{productId}")
    @Operation(summary = "Update item quantity in cart")
    public ResponseEntity<CartDto> updateQuantity(Authentication auth,
                                                   @PathVariable Long productId,
                                                   @RequestBody Map<String, Integer> body) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        int qty = body.getOrDefault("quantity", 1);
        return ResponseEntity.ok(cartService.updateQuantity(p.getUserId(), productId, qty));
    }

    @DeleteMapping("/{productId}")
    @Operation(summary = "Remove product from cart")
    public ResponseEntity<CartDto> removeFromCart(Authentication auth, @PathVariable Long productId) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(cartService.removeFromCart(p.getUserId(), productId));
    }

    @DeleteMapping
    @Operation(summary = "Clear entire cart")
    public ResponseEntity<Map<String, String>> clearCart(Authentication auth) {
        UserPrincipal p = (UserPrincipal) auth.getPrincipal();
        cartService.clearCart(p.getUserId());
        return ResponseEntity.ok(Map.of("message", "Cart cleared"));
    }
}
