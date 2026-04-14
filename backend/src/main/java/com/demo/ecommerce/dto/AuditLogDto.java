package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.AuditLog;
import java.time.LocalDateTime;

public class AuditLogDto {
    private Long id;
    private Long userId;
    private String userEmail;
    private String action;
    private String entityType;
    private Long entityId;
    private String details;
    private LocalDateTime timestamp;

    public static AuditLogDto from(AuditLog log) {
        AuditLogDto dto = new AuditLogDto();
        dto.id = log.getId();
        dto.userId = log.getUserId();
        dto.userEmail = log.getUserEmail();
        dto.action = log.getAction();
        dto.entityType = log.getEntityType();
        dto.entityId = log.getEntityId();
        dto.details = log.getDetails();
        dto.timestamp = log.getTimestamp();
        return dto;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserEmail() { return userEmail; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public String getDetails() { return details; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
