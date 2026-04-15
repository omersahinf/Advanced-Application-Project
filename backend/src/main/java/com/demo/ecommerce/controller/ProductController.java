package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.ProductDto;
import com.demo.ecommerce.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<?> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size) {
        // Paginated response when page parameter is provided
        if (page != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
            if (search != null && !search.isBlank()) {
                return ResponseEntity.ok(productService.searchProducts(search, pageable));
            }
            return ResponseEntity.ok(productService.getAllProducts(pageable));
        }
        // Legacy non-paginated response
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(productService.searchProducts(search));
        }
        if (categoryId != null) {
            return ResponseEntity.ok(productService.getProductsByCategory(categoryId));
        }
        if (storeId != null) {
            return ResponseEntity.ok(productService.getProductsByStore(storeId));
        }
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }
}
