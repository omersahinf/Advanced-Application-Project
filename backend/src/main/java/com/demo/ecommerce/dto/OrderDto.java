package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.Order;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class OrderDto {
    private Long id;
    private Long userId;
    private String userName;
    private Long storeId;
    private String storeName;
    private String userCity;
    private String userMembership;
    private String status;
    private BigDecimal grandTotal;
    private String paymentMethod;
    private String salesChannel;
    private String fulfilment;
    private LocalDateTime orderDate;
    private List<OrderItemDto> items;
    private ShipmentDto shipment;

    public static OrderDto from(Order o) {
        OrderDto dto = new OrderDto();
        dto.id = o.getId();
        dto.userId = o.getUser().getId();
        dto.userName = o.getUser().getFirstName() + " " + o.getUser().getLastName();
        dto.storeId = o.getStore().getId();
        dto.storeName = o.getStore().getName();
        try {
            if (o.getUser().getCustomerProfile() != null) {
                dto.userCity = o.getUser().getCustomerProfile().getCity();
                dto.userMembership = o.getUser().getCustomerProfile().getMembershipType() != null
                        ? o.getUser().getCustomerProfile().getMembershipType().name()
                        : null;
            }
        } catch (Exception ignored) {
            // customerProfile lazy-load dışında erişilemedi; null bırak, akışı kesme
        }
        dto.status = o.getStatus().name();
        dto.grandTotal = o.getGrandTotal();
        dto.paymentMethod = o.getPaymentMethod();
        dto.salesChannel = o.getSalesChannel();
        dto.fulfilment = o.getFulfilment();
        dto.orderDate = o.getOrderDate();
        if (o.getOrderItems() != null) {
            dto.items = o.getOrderItems().stream()
                    .map(OrderItemDto::from)
                    .collect(Collectors.toList());
        }
        if (o.getShipment() != null) {
            dto.shipment = ShipmentDto.from(o.getShipment());
        }
        return dto;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public Long getStoreId() { return storeId; }
    public String getStoreName() { return storeName; }
    public String getUserCity() { return userCity; }
    public String getUserMembership() { return userMembership; }
    public String getStatus() { return status; }
    public BigDecimal getGrandTotal() { return grandTotal; }
    public String getPaymentMethod() { return paymentMethod; }
    public String getSalesChannel() { return salesChannel; }
    public String getFulfilment() { return fulfilment; }
    public LocalDateTime getOrderDate() { return orderDate; }
    public List<OrderItemDto> getItems() { return items; }
    public ShipmentDto getShipment() { return shipment; }
}
