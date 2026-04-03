package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.ShipmentDto;
import com.demo.ecommerce.entity.ShipmentStatus;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.ShipmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/shipments")
public class ShipmentController {

    private final ShipmentService shipmentService;

    public ShipmentController(ShipmentService shipmentService) {
        this.shipmentService = shipmentService;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ShipmentDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getById(id));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ShipmentDto> getByOrderId(@PathVariable Long orderId,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(shipmentService.getByOrderId(orderId, principal.getUserId(), principal.getRole()));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<ShipmentDto>> getAll(Pageable pageable,
                                                     @RequestParam(required = false) String status) {
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(new PageImpl<>(shipmentService.getByStatus(status)));
        }
        return ResponseEntity.ok(shipmentService.getAll(pageable));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'CORPORATE')")
    public ResponseEntity<ShipmentDto> updateStatus(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        ShipmentStatus status = ShipmentStatus.valueOf(body.get("status"));
        String trackingNumber = body.get("trackingNumber");
        return ResponseEntity.ok(shipmentService.updateStatus(id, status, trackingNumber,
                principal.getUserId(), principal.getRole()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ShipmentDto> update(@PathVariable Long id,
                                               @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(shipmentService.update(id,
                body.get("warehouse"), body.get("mode"),
                body.get("carrier"), body.get("destination")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        shipmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
