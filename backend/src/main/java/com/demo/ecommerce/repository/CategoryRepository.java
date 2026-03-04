package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByParentIsNull();
    Optional<Category> findByName(String name);
    List<Category> findByParentId(Long parentId);
}
