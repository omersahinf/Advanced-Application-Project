package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.CartItem;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CartItemDto {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private BigDecimal unitPrice;
    private Integer stock;
    private Integer quantity;
    private BigDecimal subtotal;
    private String storeName;
    private Long storeId;
    private LocalDateTime addedAt;

    public static CartItemDto from(CartItem ci) {
        CartItemDto dto = new CartItemDto();
        dto.id = ci.getId();
        dto.productId = ci.getProduct().getId();
        dto.productName = ci.getProduct().getName();
        dto.productSku = ci.getProduct().getSku();
        dto.unitPrice = ci.getProduct().getUnitPrice();
        dto.stock = ci.getProduct().getStock();
        dto.quantity = ci.getQuantity();
        dto.subtotal = ci.getProduct().getUnitPrice().multiply(BigDecimal.valueOf(ci.getQuantity()));
        dto.storeName = ci.getProduct().getStore().getName();
        dto.storeId = ci.getProduct().getStore().getId();
        dto.addedAt = ci.getAddedAt();
        return dto;
    }

    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public String getProductSku() { return productSku; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public Integer getStock() { return stock; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getSubtotal() { return subtotal; }
    public String getStoreName() { return storeName; }
    public Long getStoreId() { return storeId; }
    public LocalDateTime getAddedAt() { return addedAt; }
}
