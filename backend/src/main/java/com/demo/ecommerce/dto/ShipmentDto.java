package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.Shipment;
import java.time.LocalDateTime;

public class ShipmentDto {
    private Long id;
    private Long orderId;
    private String warehouse;
    private String mode;
    private String status;
    private String trackingNumber;
    private String carrier;
    private String destination;
    private Integer customerCareCalls;
    private LocalDateTime shippedDate;
    private LocalDateTime estimatedArrival;
    private LocalDateTime deliveredDate;

    public static ShipmentDto from(Shipment s) {
        ShipmentDto dto = new ShipmentDto();
        dto.id = s.getId();
        dto.orderId = s.getOrder().getId();
        dto.warehouse = s.getWarehouse();
        dto.mode = s.getMode();
        dto.status = s.getStatus().name();
        dto.trackingNumber = s.getTrackingNumber();
        dto.carrier = s.getCarrier();
        dto.destination = s.getDestination();
        dto.customerCareCalls = s.getCustomerCareCalls();
        dto.shippedDate = s.getShippedDate();
        dto.estimatedArrival = s.getEstimatedArrival();
        dto.deliveredDate = s.getDeliveredDate();
        return dto;
    }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public String getWarehouse() { return warehouse; }
    public String getMode() { return mode; }
    public String getStatus() { return status; }
    public String getTrackingNumber() { return trackingNumber; }
    public String getCarrier() { return carrier; }
    public String getDestination() { return destination; }
    public Integer getCustomerCareCalls() { return customerCareCalls; }
    public LocalDateTime getShippedDate() { return shippedDate; }
    public LocalDateTime getEstimatedArrival() { return estimatedArrival; }
    public LocalDateTime getDeliveredDate() { return deliveredDate; }
}
