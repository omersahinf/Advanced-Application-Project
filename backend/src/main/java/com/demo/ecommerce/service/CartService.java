package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.AddToCartRequest;
import com.demo.ecommerce.dto.CartDto;
import com.demo.ecommerce.dto.CartItemDto;
import com.demo.ecommerce.entity.CartItem;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.BadRequestException;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.CartItemRepository;
import com.demo.ecommerce.repository.ProductRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CartService {

    private static final Logger log = LoggerFactory.getLogger(CartService.class);

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(CartItemRepository cartItemRepository, ProductRepository productRepository,
                       UserRepository userRepository) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public CartDto getCart(Long userId) {
        List<CartItemDto> items = cartItemRepository.findByUserId(userId).stream()
                .map(CartItemDto::from)
                .collect(Collectors.toList());
        return new CartDto(items);
    }

    @Transactional
    public CartDto addToCart(Long userId, AddToCartRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (product.getStock() < request.getQuantity()) {
            throw new BadRequestException("Insufficient stock. Available: " + product.getStock());
        }

        Optional<CartItem> existing = cartItemRepository.findByUserIdAndProductId(userId, request.getProductId());
        if (existing.isPresent()) {
            CartItem ci = existing.get();
            int newQty = ci.getQuantity() + request.getQuantity();
            if (product.getStock() < newQty) {
                throw new BadRequestException("Insufficient stock. Available: " + product.getStock());
            }
            ci.setQuantity(newQty);
            cartItemRepository.save(ci);
        } else {
            CartItem ci = new CartItem();
            ci.setUser(user);
            ci.setProduct(product);
            ci.setQuantity(request.getQuantity());
            cartItemRepository.save(ci);
        }

        return getCart(userId);
    }

    @Transactional
    public CartDto updateQuantity(Long userId, Long productId, int quantity) {
        CartItem ci = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not in cart"));

        if (quantity <= 0) {
            cartItemRepository.delete(ci);
        } else {
            if (ci.getProduct().getStock() < quantity) {
                throw new BadRequestException("Insufficient stock. Available: " + ci.getProduct().getStock());
            }
            ci.setQuantity(quantity);
            cartItemRepository.save(ci);
        }

        return getCart(userId);
    }

    @Transactional
    public CartDto removeFromCart(Long userId, Long productId) {
        cartItemRepository.deleteByUserIdAndProductId(userId, productId);
        return getCart(userId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }
}
