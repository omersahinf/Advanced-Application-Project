package com.demo.ecommerce.dto;

public class UserInfoDto {
    private Long id;
    private String email;
    private String role;
    private String companyName;

    public UserInfoDto(Long id, String email, String role, String companyName) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.companyName = companyName;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getCompanyName() { return companyName; }
}
