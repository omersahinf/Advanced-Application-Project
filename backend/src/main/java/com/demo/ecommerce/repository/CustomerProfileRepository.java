package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.CustomerProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {

    @Override
    @EntityGraph(attributePaths = "owner")
    Optional<CustomerProfile> findById(Long id);

    @Override
    @EntityGraph(attributePaths = "owner")
    Page<CustomerProfile> findAll(Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Optional<CustomerProfile> findByOwnerId(Long userId);
}
