package com.demo.ecommerce.dto;

import java.math.BigDecimal;
import java.util.List;

public class CartDto {
    private List<CartItemDto> items;
    private BigDecimal total;
    private int itemCount;

    public CartDto(List<CartItemDto> items) {
        this.items = items;
        this.total = items.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.itemCount = items.stream()
                .mapToInt(CartItemDto::getQuantity)
                .sum();
    }

    public List<CartItemDto> getItems() { return items; }
    public BigDecimal getTotal() { return total; }
    public int getItemCount() { return itemCount; }
}
