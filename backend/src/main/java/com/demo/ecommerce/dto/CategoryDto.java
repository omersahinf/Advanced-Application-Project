package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.Category;
import java.util.List;
import java.util.stream.Collectors;

public class CategoryDto {
    private Long id;
    private String name;
    private Long parentId;
    private String parentName;
    private List<CategoryDto> children;

    public static CategoryDto from(Category c) {
        CategoryDto dto = new CategoryDto();
        dto.id = c.getId();
        dto.name = c.getName();
        if (c.getParent() != null) {
            dto.parentId = c.getParent().getId();
            dto.parentName = c.getParent().getName();
        }
        if (c.getChildren() != null && !c.getChildren().isEmpty()) {
            dto.children = c.getChildren().stream()
                    .map(CategoryDto::from)
                    .collect(Collectors.toList());
        }
        return dto;
    }

    public static CategoryDto flat(Category c) {
        CategoryDto dto = new CategoryDto();
        dto.id = c.getId();
        dto.name = c.getName();
        if (c.getParent() != null) {
            dto.parentId = c.getParent().getId();
            dto.parentName = c.getParent().getName();
        }
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public Long getParentId() { return parentId; }
    public String getParentName() { return parentName; }
    public List<CategoryDto> getChildren() { return children; }
}
