package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CategoryDto;
import com.demo.ecommerce.dto.CreateCategoryRequest;
import com.demo.ecommerce.entity.Category;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryDto> getTree() {
        return categoryRepository.findByParentIsNull().stream()
                .map(CategoryDto::from)
                .collect(Collectors.toList());
    }

    public List<CategoryDto> getAll() {
        return categoryRepository.findAll().stream()
                .map(CategoryDto::flat)
                .collect(Collectors.toList());
    }

    public CategoryDto getById(Long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return CategoryDto.from(cat);
    }

    @Transactional
    public CategoryDto create(CreateCategoryRequest req) {
        Category cat = new Category();
        cat.setName(req.getName());
        if (req.getParentId() != null) {
            Category parent = categoryRepository.findById(req.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found"));
            cat.setParent(parent);
        }
        return CategoryDto.from(categoryRepository.save(cat));
    }

    @Transactional
    public CategoryDto update(Long id, CreateCategoryRequest req) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        cat.setName(req.getName());
        if (req.getParentId() != null) {
            Category parent = categoryRepository.findById(req.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found"));
            cat.setParent(parent);
        } else {
            cat.setParent(null);
        }
        return CategoryDto.from(categoryRepository.save(cat));
    }

    @Transactional
    public void delete(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found");
        }
        categoryRepository.deleteById(id);
    }
}
