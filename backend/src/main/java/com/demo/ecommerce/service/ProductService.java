package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateProductRequest;
import com.demo.ecommerce.dto.ProductDto;
import com.demo.ecommerce.entity.Category;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.repository.CategoryRepository;
import com.demo.ecommerce.repository.ProductRepository;
import com.demo.ecommerce.repository.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository, StoreRepository storeRepository,
                          CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
    }

    // --- Browse (all authenticated users) ---

    public List<ProductDto> getAllProducts() {
        return productRepository.findAll().stream()
                .map(ProductDto::from)
                .collect(Collectors.toList());
    }

    public ProductDto getProductById(Long id) {
        return productRepository.findById(id)
                .map(ProductDto::from)
                .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    public List<ProductDto> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId).stream()
                .map(ProductDto::from)
                .collect(Collectors.toList());
    }

    public List<ProductDto> getProductsByStore(Long storeId) {
        return productRepository.findByStoreId(storeId).stream()
                .map(ProductDto::from)
                .collect(Collectors.toList());
    }

    public List<ProductDto> searchProducts(String query) {
        return productRepository.findAll().stream()
                .filter(p -> p.getName().toLowerCase().contains(query.toLowerCase()))
                .map(ProductDto::from)
                .collect(Collectors.toList());
    }

    // --- Corporate CRUD (own store products) ---

    public List<ProductDto> getProductsForOwner(Long ownerId) {
        return productRepository.findByStoreOwnerId(ownerId).stream()
                .map(ProductDto::from)
                .collect(Collectors.toList());
    }

    public ProductDto getProductForOwner(Long productId, Long ownerId) {
        return productRepository.findByIdAndStoreOwnerId(productId, ownerId)
                .map(ProductDto::from)
                .orElseThrow(() -> new RuntimeException("Product not found or not authorized"));
    }

    @Transactional
    public ProductDto createProduct(Long ownerId, CreateProductRequest req) {
        List<Store> stores = storeRepository.findByOwnerId(ownerId);
        if (stores.isEmpty()) {
            throw new RuntimeException("No store found for this user");
        }
        Store store = stores.get(0);

        Product product = new Product();
        product.setStore(store);
        product.setName(req.getName());
        product.setDescription(req.getDescription());
        product.setUnitPrice(req.getUnitPrice());
        product.setStock(req.getStock());
        product.setSku(req.getSku());

        if (req.getCategoryId() != null) {
            Category cat = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            product.setCategory(cat);
        }

        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long productId, Long ownerId, CreateProductRequest req) {
        Product product = productRepository.findByIdAndStoreOwnerId(productId, ownerId)
                .orElseThrow(() -> new RuntimeException("Product not found or not authorized"));

        product.setName(req.getName());
        product.setDescription(req.getDescription());
        product.setUnitPrice(req.getUnitPrice());
        product.setStock(req.getStock());
        if (req.getSku() != null) product.setSku(req.getSku());

        if (req.getCategoryId() != null) {
            Category cat = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            product.setCategory(cat);
        }

        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long productId, Long ownerId) {
        Product product = productRepository.findByIdAndStoreOwnerId(productId, ownerId)
                .orElseThrow(() -> new RuntimeException("Product not found or not authorized"));
        productRepository.delete(product);
    }

    public List<Product> getRawProductsForUser(Long userId) {
        return productRepository.findByStoreOwnerId(userId);
    }

    public List<ProductDto> searchProductsForOwner(Long ownerId, String query) {
        return productRepository.findByStoreOwnerIdAndNameContainingIgnoreCase(ownerId, query).stream()
                .map(ProductDto::from)
                .collect(Collectors.toList());
    }
}
