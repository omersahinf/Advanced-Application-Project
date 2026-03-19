package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductId(Long productId);
    List<Review> findByUserId(Long userId);
    List<Review> findByProductStoreId(Long storeId);
    List<Review> findByProductStoreOwnerId(Long ownerId);
}
