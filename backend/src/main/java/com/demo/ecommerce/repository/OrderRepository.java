package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.Order;
import com.demo.ecommerce.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);
    List<Order> findByStoreId(Long storeId);
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);
    List<Order> findByStoreOwnerId(Long ownerId);

    Page<Order> findAll(Pageable pageable);

    java.util.Optional<Order> findByIdAndUserId(Long id, Long userId);

    java.util.Optional<Order> findByStripePaymentIntentId(String stripePaymentIntentId);
}
