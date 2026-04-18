package com.demo.ecommerce.service;

import com.demo.ecommerce.entity.SystemSetting;
import com.demo.ecommerce.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SystemSettingsService {

    private final SystemSettingRepository repository;

    private static final List<SettingDefault> DEFAULTS = List.of(
            new SettingDefault("siteName", "E-Commerce Analytics Platform", "STRING"),
            new SettingDefault("maintenanceMode", "false", "BOOLEAN"),
            new SettingDefault("maxProductsPerStore", "500", "INTEGER"),
            new SettingDefault("defaultCurrency", "USD", "STRING"),
            new SettingDefault("orderAutoConfirm", "false", "BOOLEAN"),
            new SettingDefault("reviewModerationEnabled", "true", "BOOLEAN"),
            new SettingDefault("lowStockThreshold", "10", "INTEGER"),
            new SettingDefault("sessionTimeoutMinutes", "60", "INTEGER")
    );

    public SystemSettingsService(SystemSettingRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    @Transactional
    public void seedDefaults() {
        for (SettingDefault d : DEFAULTS) {
            if (!repository.existsByKey(d.key())) {
                SystemSetting s = new SystemSetting();
                s.setKey(d.key());
                s.setValue(d.value());
                s.setValueType(d.type());
                s.setUpdatedBy("system");
                repository.save(s);
            }
        }
    }

    public Map<String, Object> getAll() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (SystemSetting s : repository.findAll()) {
            out.put(s.getKey(), parseValue(s));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> update(Map<String, Object> incoming, String updatedBy) {
        for (Map.Entry<String, Object> e : incoming.entrySet()) {
            SystemSetting existing = repository.findByKey(e.getKey()).orElseGet(() -> {
                SystemSetting s = new SystemSetting();
                s.setKey(e.getKey());
                s.setValueType(inferType(e.getValue()));
                return s;
            });
            existing.setValue(e.getValue() == null ? null : String.valueOf(e.getValue()));
            existing.setUpdatedBy(updatedBy);
            repository.save(existing);
        }
        return getAll();
    }

    private Object parseValue(SystemSetting s) {
        if (s.getValue() == null) return null;
        return switch (s.getValueType()) {
            case "BOOLEAN" -> Boolean.parseBoolean(s.getValue());
            case "INTEGER" -> {
                try { yield Integer.parseInt(s.getValue()); }
                catch (NumberFormatException ex) { yield s.getValue(); }
            }
            default -> s.getValue();
        };
    }

    private String inferType(Object v) {
        if (v instanceof Boolean) return "BOOLEAN";
        if (v instanceof Integer || v instanceof Long) return "INTEGER";
        return "STRING";
    }

    private record SettingDefault(String key, String value, String type) {}
}
