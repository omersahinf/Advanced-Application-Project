package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.ShipmentDto;
import com.demo.ecommerce.entity.Shipment;
import com.demo.ecommerce.entity.ShipmentStatus;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.exception.UnauthorizedOperationException;
import com.demo.ecommerce.repository.ShipmentRepository;
import com.demo.ecommerce.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;

    public ShipmentService(ShipmentRepository shipmentRepository, OrderRepository orderRepository) {
        this.shipmentRepository = shipmentRepository;
        this.orderRepository = orderRepository;
    }

    public ShipmentDto getById(Long id) {
        return shipmentRepository.findById(id)
                .map(ShipmentDto::from)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", id));
    }

    public ShipmentDto getByOrderId(Long orderId, Long userId, String role) {
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment for order " + orderId + " not found"));
        validateAccess(shipment, userId, role);
        return ShipmentDto.from(shipment);
    }

    public List<ShipmentDto> getAll() {
        return shipmentRepository.findAll().stream().map(ShipmentDto::from).toList();
    }

    public Page<ShipmentDto> getAll(Pageable pageable) {
        return shipmentRepository.findAll(pageable).map(ShipmentDto::from);
    }

    public List<ShipmentDto> getByStatus(String status) {
        return shipmentRepository.findByStatus(status).stream().map(ShipmentDto::from).toList();
    }

    @Transactional
    public ShipmentDto updateStatus(Long id, ShipmentStatus status, String trackingNumber, Long userId, String role) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", id));
        validateWriteAccess(shipment, userId, role);
        shipment.setStatus(status);
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            shipment.setTrackingNumber(trackingNumber);
        }
        if (status == ShipmentStatus.DELIVERED && shipment.getDeliveredDate() == null) {
            shipment.setDeliveredDate(java.time.LocalDateTime.now());
        }
        return ShipmentDto.from(shipmentRepository.save(shipment));
    }

    @Transactional
    public ShipmentDto update(Long id, String warehouse, String mode, String carrier, String destination) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", id));
        if (warehouse != null) shipment.setWarehouse(warehouse);
        if (mode != null) shipment.setMode(mode);
        if (carrier != null) shipment.setCarrier(carrier);
        if (destination != null) shipment.setDestination(destination);
        return ShipmentDto.from(shipmentRepository.save(shipment));
    }

    @Transactional
    public void delete(Long id) {
        if (!shipmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Shipment", id);
        }
        shipmentRepository.deleteById(id);
    }

    private void validateAccess(Shipment shipment, Long userId, String role) {
        if ("ADMIN".equals(role)) return;
        if ("INDIVIDUAL".equals(role)) {
            if (!shipment.getOrder().getUser().getId().equals(userId)) {
                throw new UnauthorizedOperationException("You can only view your own shipments");
            }
        } else if ("CORPORATE".equals(role)) {
            if (!shipment.getOrder().getStore().getOwner().getId().equals(userId)) {
                throw new UnauthorizedOperationException("You can only view your store's shipments");
            }
        }
    }

    private void validateWriteAccess(Shipment shipment, Long userId, String role) {
        if ("ADMIN".equals(role)) return;
        if ("CORPORATE".equals(role)) {
            if (!shipment.getOrder().getStore().getOwner().getId().equals(userId)) {
                throw new UnauthorizedOperationException("You can only update your store's shipments");
            }
        } else {
            throw new UnauthorizedOperationException("Only admin or store owner can update shipments");
        }
    }
}
