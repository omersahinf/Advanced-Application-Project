package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.CategoryDto;
import com.demo.ecommerce.entity.Category;
import com.demo.ecommerce.service.CategoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryController categoryController;

    private CategoryDto sampleCategoryDto(Long id, String name) {
        Category c = new Category();
        c.setId(id);
        c.setName(name);
        return CategoryDto.from(c);
    }

    @Test
    void getCategories_returnsList() {
        when(categoryService.getAll()).thenReturn(List.of(sampleCategoryDto(1L, "Electronics")));

        ResponseEntity<List<CategoryDto>> response = categoryController.getCategories();

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
        assertEquals("Electronics", response.getBody().get(0).getName());
    }

    @Test
    void getCategoryTree_delegatesToService() {
        when(categoryService.getTree()).thenReturn(List.of());

        ResponseEntity<List<CategoryDto>> response = categoryController.getCategoryTree();

        assertEquals(200, response.getStatusCode().value());
        verify(categoryService).getTree();
    }

    @Test
    void getCategory_byId_returnsCategory() {
        when(categoryService.getById(5L)).thenReturn(sampleCategoryDto(5L, "Phones"));

        ResponseEntity<CategoryDto> response = categoryController.getCategory(5L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(5L, response.getBody().getId());
    }
}
