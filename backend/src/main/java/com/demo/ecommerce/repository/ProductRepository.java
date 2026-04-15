package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByStoreId(Long storeId);

    List<Product> findByStoreOwnerId(Long ownerId);

    Optional<Product> findByIdAndStoreOwnerId(Long id, Long ownerId);

    List<Product> findByStoreOwnerIdAndNameContainingIgnoreCase(Long ownerId, String name);

    List<Product> findByStoreOwnerIdAndCategoryId(Long ownerId, Long categoryId);

    List<Product> findByCategoryId(Long categoryId);

    Page<Product> findAll(Pageable pageable);

    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
