package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.Store;
import java.time.LocalDateTime;

public class StoreDto {
    private Long id;
    private String name;
    private String description;
    private String status;
    private String ownerName;
    private Long ownerId;
    private int productCount;
    private LocalDateTime createdAt;

    public static StoreDto from(Store s) {
        StoreDto dto = new StoreDto();
        dto.id = s.getId();
        dto.name = s.getName();
        dto.description = s.getDescription();
        dto.status = s.getStatus();
        dto.ownerName = s.getOwner().getFirstName() + " " + s.getOwner().getLastName();
        dto.ownerId = s.getOwner().getId();
        dto.productCount = s.getProducts() != null ? s.getProducts().size() : 0;
        dto.createdAt = s.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public String getOwnerName() { return ownerName; }
    public Long getOwnerId() { return ownerId; }
    public int getProductCount() { return productCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
