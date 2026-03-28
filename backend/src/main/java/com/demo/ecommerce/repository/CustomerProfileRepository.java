package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {
    Optional<CustomerProfile> findByOwnerId(Long userId);
}
