package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.User;
import java.time.LocalDateTime;

public class UserDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String gender;
    private LocalDateTime createdAt;
    private String storeName;
    private boolean suspended;

    public static UserDto from(User u) {
        UserDto dto = new UserDto();
        dto.id = u.getId();
        dto.firstName = u.getFirstName();
        dto.lastName = u.getLastName();
        dto.email = u.getEmail();
        dto.role = u.getRoleType().name();
        dto.gender = u.getGender();
        dto.createdAt = u.getCreatedAt();
        dto.suspended = u.isSuspended();
        if (u.getStores() != null && !u.getStores().isEmpty()) {
            dto.storeName = u.getStores().get(0).getName();
        }
        return dto;
    }

    public Long getId() { return id; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getGender() { return gender; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getStoreName() { return storeName; }
    public boolean isSuspended() { return suspended; }
}
