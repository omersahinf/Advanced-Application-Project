package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.Product;
import java.math.BigDecimal;

public class ProductDto {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private String category;
    private Integer stock;
    private String sku;
    private Long storeId;
    private String storeName;

    public static ProductDto from(Product p) {
        ProductDto dto = new ProductDto();
        dto.id = p.getId();
        dto.name = p.getName();
        dto.description = p.getDescription();
        dto.price = p.getUnitPrice();
        dto.category = p.getCategory() != null ? p.getCategory().getName() : null;
        dto.stock = p.getStock();
        dto.sku = p.getSku();
        dto.storeId = p.getStore() != null ? p.getStore().getId() : null;
        dto.storeName = p.getStore() != null ? p.getStore().getName() : null;
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public String getCategory() { return category; }
    public Integer getStock() { return stock; }
    public String getSku() { return sku; }
    public Long getStoreId() { return storeId; }
    public String getStoreName() { return storeName; }
}
