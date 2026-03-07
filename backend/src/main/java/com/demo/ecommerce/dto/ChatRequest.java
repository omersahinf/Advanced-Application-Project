package com.demo.ecommerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChatRequest {

    @NotBlank(message = "Message is required")
    @Size(max = 500, message = "Message must be under 500 characters")
    private String message;

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
