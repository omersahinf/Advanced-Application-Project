package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.ShipmentDto;
import com.demo.ecommerce.entity.Order;
import com.demo.ecommerce.entity.Shipment;
import com.demo.ecommerce.entity.ShipmentStatus;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.ShipmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShipmentControllerTest {

    @Mock
    private ShipmentService shipmentService;

    @InjectMocks
    private ShipmentController shipmentController;

    private ShipmentDto sample;

    @BeforeEach
    void setUp() {
        Order order = new Order();
        order.setId(10L);
        Shipment s = new Shipment();
        s.setId(1L);
        s.setOrder(order);
        s.setMode("FLIGHT");
        s.setStatus(ShipmentStatus.IN_TRANSIT);
        s.setWarehouse("WH-1");
        sample = ShipmentDto.from(s);
    }

    @Test
    void getById_returnsShipment() {
        when(shipmentService.getById(1L)).thenReturn(sample);

        ResponseEntity<ShipmentDto> response = shipmentController.getById(1L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("FLIGHT", response.getBody().getMode());
    }

    @Test
    void getByOrderId_passesPrincipalContext() {
        UserPrincipal principal = new UserPrincipal(42L, "x@x.com", "INDIVIDUAL");
        when(shipmentService.getByOrderId(10L, 42L, "INDIVIDUAL")).thenReturn(sample);

        ResponseEntity<ShipmentDto> response = shipmentController.getByOrderId(10L, principal);

        assertEquals(200, response.getStatusCode().value());
        verify(shipmentService).getByOrderId(10L, 42L, "INDIVIDUAL");
    }

    @Test
    void getAll_noStatus_returnsPage() {
        Page<ShipmentDto> page = new PageImpl<>(List.of(sample));
        when(shipmentService.getAll(any(Pageable.class))).thenReturn(page);

        ResponseEntity<Page<ShipmentDto>> response = shipmentController.getAll(Pageable.unpaged(), null);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().getTotalElements());
    }

    @Test
    void getAll_withStatusFilter_callsByStatus() {
        when(shipmentService.getByStatus("IN_TRANSIT")).thenReturn(List.of(sample));

        ResponseEntity<Page<ShipmentDto>> response =
                shipmentController.getAll(Pageable.unpaged(), "IN_TRANSIT");

        assertEquals(200, response.getStatusCode().value());
        verify(shipmentService).getByStatus("IN_TRANSIT");
    }

    @Test
    void updateStatus_passesStatusAndTracking() {
        UserPrincipal principal = new UserPrincipal(1L, "admin@x.com", "ADMIN");
        when(shipmentService.updateStatus(eq(1L), eq(ShipmentStatus.DELIVERED), eq("TRK-9"), eq(1L), eq("ADMIN")))
                .thenReturn(sample);

        ResponseEntity<ShipmentDto> response = shipmentController.updateStatus(
                1L, Map.of("status", "DELIVERED", "trackingNumber", "TRK-9"), principal);

        assertEquals(200, response.getStatusCode().value());
        verify(shipmentService).updateStatus(1L, ShipmentStatus.DELIVERED, "TRK-9", 1L, "ADMIN");
    }
}
