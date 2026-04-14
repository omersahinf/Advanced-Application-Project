package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.AuditLogDto;
import com.demo.ecommerce.entity.AuditLog;
import com.demo.ecommerce.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(Long userId, String userEmail, String action, String entityType, Long entityId, String details) {
        AuditLog entry = new AuditLog();
        entry.setUserId(userId);
        entry.setUserEmail(userEmail);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setDetails(details);
        auditLogRepository.save(entry);
    }

    public List<AuditLogDto> getRecentLogs() {
        return auditLogRepository.findTop50ByOrderByTimestampDesc().stream()
                .map(AuditLogDto::from)
                .collect(Collectors.toList());
    }

    public List<AuditLogDto> getLogsByUser(Long userId) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId).stream()
                .map(AuditLogDto::from)
                .collect(Collectors.toList());
    }

    public List<AuditLogDto> getLogsByAction(String action) {
        return auditLogRepository.findByActionOrderByTimestampDesc(action).stream()
                .map(AuditLogDto::from)
                .collect(Collectors.toList());
    }

    public List<AuditLogDto> getLogsByEntityType(String entityType) {
        return auditLogRepository.findByEntityTypeOrderByTimestampDesc(entityType).stream()
                .map(AuditLogDto::from)
                .collect(Collectors.toList());
    }
}
