package com.demo.ecommerce.repository;

import com.demo.ecommerce.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
    Optional<SystemSetting> findByKey(String key);
    boolean existsByKey(String key);
}
