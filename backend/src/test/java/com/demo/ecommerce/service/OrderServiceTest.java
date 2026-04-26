package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateOrderRequest;
import com.demo.ecommerce.dto.OrderDto;
import com.demo.ecommerce.entity.*;
import com.demo.ecommerce.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private UserRepository userRepository;
    @Mock private ShipmentRepository shipmentRepository;

    @InjectMocks
    private OrderService orderService;

    private User testUser;
    private Store testStore;
    private Product testProduct;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setEmail("test@example.com");
        testUser.setRoleType(RoleType.INDIVIDUAL);

        testStore = new Store();
        testStore.setId(1L);
        testStore.setName("Test Store");
        testStore.setStatus(StoreStatus.ACTIVE);
        testStore.setOwner(testUser);

        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setName("Test Product");
        testProduct.setUnitPrice(BigDecimal.valueOf(29.99));
        testProduct.setStock(100);
        testProduct.setStore(testStore);

        testOrder = new Order();
        testOrder.setId(1L);
        testOrder.setUser(testUser);
        testOrder.setStore(testStore);
        testOrder.setStatus(OrderStatus.PENDING);
        testOrder.setGrandTotal(BigDecimal.valueOf(59.98));
        testOrder.setOrderDate(LocalDateTime.now());
    }

    @Test
    void placeOrder_success() {
        CreateOrderRequest req = new CreateOrderRequest();
        req.setStoreId(1L);
        CreateOrderRequest.ItemRequest item = new CreateOrderRequest.ItemRequest();
        item.setProductId(1L);
        item.setQuantity(2);
        req.setItems(List.of(item));

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(1L);
            o.setOrderDate(LocalDateTime.now());
            return o;
        });

        OrderDto result = orderService.placeOrder(1L, req);

        assertNotNull(result);
        assertEquals("PENDING", result.getStatus());
        assertEquals(BigDecimal.valueOf(59.98), result.getGrandTotal());
        assertEquals(98, testProduct.getStock()); // stock decremented
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void placeOrder_stripeStartsPending() {
        CreateOrderRequest req = new CreateOrderRequest();
        req.setStoreId(1L);
        req.setPaymentMethod("STRIPE");
        CreateOrderRequest.ItemRequest item = new CreateOrderRequest.ItemRequest();
        item.setProductId(1L);
        item.setQuantity(1);
        req.setItems(List.of(item));

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(2L);
            o.setOrderDate(LocalDateTime.now());
            return o;
        });

        OrderDto result = orderService.placeOrder(1L, req);

        assertEquals("CREDIT_CARD", result.getPaymentMethod());
        assertEquals("PENDING", result.getStatus());
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void placeOrder_inactiveStore_throws() {
        testStore.setStatus(StoreStatus.CLOSED);
        CreateOrderRequest req = new CreateOrderRequest();
        req.setStoreId(1L);
        req.setItems(List.of());

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));

        assertThrows(RuntimeException.class, () -> orderService.placeOrder(1L, req));
    }

    @Test
    void placeOrder_insufficientStock_throws() {
        testProduct.setStock(1);
        CreateOrderRequest req = new CreateOrderRequest();
        req.setStoreId(1L);
        CreateOrderRequest.ItemRequest item = new CreateOrderRequest.ItemRequest();
        item.setProductId(1L);
        item.setQuantity(5);
        req.setItems(List.of(item));

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(testStore));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));

        assertThrows(RuntimeException.class, () -> orderService.placeOrder(1L, req));
    }

    @Test
    void updateOrderStatus_adminCanUpdateAny() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(testOrder);

        OrderDto result = orderService.updateOrderStatus(1L, OrderStatus.CONFIRMED, 99L, "ADMIN");

        assertEquals("CONFIRMED", result.getStatus());
    }

    @Test
    void updateOrderStatus_individualCanOnlyCancel() {
        testOrder.setUser(testUser);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        assertThrows(RuntimeException.class,
                () -> orderService.updateOrderStatus(1L, OrderStatus.SHIPPED, 1L, "INDIVIDUAL"));
    }

    @Test
    void updateOrderStatus_individualCancelAllowed() {
        testOrder.setUser(testUser);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(any(Order.class))).thenReturn(testOrder);

        OrderDto result = orderService.updateOrderStatus(1L, OrderStatus.CANCELLED, 1L, "INDIVIDUAL");

        assertEquals("CANCELLED", result.getStatus());
    }

    @Test
    void updateOrderStatus_individualCannotCancelAfterShipped() {
        testOrder.setUser(testUser);
        testOrder.setStatus(OrderStatus.SHIPPED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        assertThrows(RuntimeException.class,
                () -> orderService.updateOrderStatus(1L, OrderStatus.CANCELLED, 1L, "INDIVIDUAL"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void getOrderByIdAndUserId_found() {
        when(orderRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(testOrder));

        OrderDto result = orderService.getOrderByIdAndUserId(1L, 1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
    }

    @Test
    void getOrderByIdAndUserId_notFound_throws() {
        when(orderRepository.findByIdAndUserId(1L, 999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> orderService.getOrderByIdAndUserId(1L, 999L));
    }
}
