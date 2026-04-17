package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.ProductDto;
import com.demo.ecommerce.entity.Category;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.entity.RoleType;
import com.demo.ecommerce.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    @Mock
    private ProductService productService;

    @InjectMocks
    private ProductController productController;

    private ProductDto sampleProduct;

    @BeforeEach
    void setUp() {
        User owner = new User();
        owner.setId(1L);
        owner.setFirstName("Owner");
        owner.setLastName("User");
        owner.setRoleType(RoleType.CORPORATE);

        Store store = new Store();
        store.setId(1L);
        store.setName("Test Store");
        store.setOwner(owner);

        Category category = new Category();
        category.setId(1L);
        category.setName("Electronics");

        Product product = new Product();
        product.setId(1L);
        product.setName("Laptop Pro");
        product.setDescription("High-end laptop");
        product.setUnitPrice(BigDecimal.valueOf(999.99));
        product.setStock(25);
        product.setSku("LPT-001");
        product.setStore(store);
        product.setCategory(category);

        sampleProduct = ProductDto.from(product);
    }

    @Test
    void getProducts_noParams_returnsAllProducts() {
        when(productService.getAllProducts()).thenReturn(List.of(sampleProduct));

        ResponseEntity<?> response = productController.getProducts(null, null, null, null, 20);

        assertEquals(200, response.getStatusCode().value());
        List<?> body = (List<?>) response.getBody();
        assertNotNull(body);
        assertEquals(1, body.size());
    }

    @Test
    void getProducts_withPage_returnsPaginated() {
        Page<ProductDto> page = new PageImpl<>(
                List.of(sampleProduct),
                PageRequest.of(0, 5, Sort.by("id").descending()),
                1
        );
        when(productService.getAllProducts(any(Pageable.class))).thenReturn(page);

        ResponseEntity<?> response = productController.getProducts(null, null, null, 0, 5);

        assertEquals(200, response.getStatusCode().value());
        Page<?> body = (Page<?>) response.getBody();
        assertNotNull(body);
        assertEquals(1, body.getTotalElements());
        assertEquals(1, body.getContent().size());
    }

    @Test
    void getProducts_withSearch_callsSearchProducts() {
        when(productService.searchProducts("Laptop")).thenReturn(List.of(sampleProduct));

        ResponseEntity<?> response = productController.getProducts("Laptop", null, null, null, 20);

        assertEquals(200, response.getStatusCode().value());
        verify(productService).searchProducts("Laptop");
    }

    @Test
    void getProducts_withSearchAndPage_callsPaginatedSearch() {
        Page<ProductDto> page = new PageImpl<>(List.of(sampleProduct));
        when(productService.searchProducts(eq("Laptop"), any(Pageable.class))).thenReturn(page);

        ResponseEntity<?> response = productController.getProducts("Laptop", null, null, 0, 10);

        assertEquals(200, response.getStatusCode().value());
        verify(productService).searchProducts(eq("Laptop"), any(Pageable.class));
    }

    @Test
    void getProducts_withCategoryId_filtersByCategory() {
        when(productService.getProductsByCategory(5L)).thenReturn(List.of(sampleProduct));

        ResponseEntity<?> response = productController.getProducts(null, 5L, null, null, 20);

        assertEquals(200, response.getStatusCode().value());
        verify(productService).getProductsByCategory(5L);
    }

    @Test
    void getProducts_withStoreId_filtersByStore() {
        when(productService.getProductsByStore(3L)).thenReturn(List.of(sampleProduct));

        ResponseEntity<?> response = productController.getProducts(null, null, 3L, null, 20);

        assertEquals(200, response.getStatusCode().value());
        verify(productService).getProductsByStore(3L);
    }

    @Test
    void getProduct_byId_returnsProduct() {
        when(productService.getProductById(1L)).thenReturn(sampleProduct);

        ResponseEntity<ProductDto> response = productController.getProduct(1L);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Laptop Pro", response.getBody().getName());
        assertEquals("LPT-001", response.getBody().getSku());
    }

    @Test
    void getProduct_notFound_throwsException() {
        when(productService.getProductById(999L)).thenThrow(new RuntimeException("Product not found"));

        assertThrows(RuntimeException.class, () -> productController.getProduct(999L));
    }
}
