package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.OrderItem;
import java.math.BigDecimal;

public class OrderItemDto {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal discountPercent;

    public static OrderItemDto from(OrderItem oi) {
        OrderItemDto dto = new OrderItemDto();
        dto.id = oi.getId();
        dto.productId = oi.getProduct().getId();
        dto.productName = oi.getProduct().getName();
        dto.productSku = oi.getProduct().getSku();
        dto.quantity = oi.getQuantity();
        dto.price = oi.getPrice();
        dto.discountPercent = oi.getDiscountPercent();
        return dto;
    }

    public Long getId() { return id; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public String getProductSku() { return productSku; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getDiscountPercent() { return discountPercent; }
}
