package com.demo.ecommerce.dto;

public class LoginResponse {
    private String token;
    private String refreshToken;
    private String email;
    private String role;
    private String companyName;

    public LoginResponse(String token, String refreshToken, String email, String role, String companyName) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.email = email;
        this.role = role;
        this.companyName = companyName;
    }

    public String getToken() { return token; }
    public String getRefreshToken() { return refreshToken; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getCompanyName() { return companyName; }
}
