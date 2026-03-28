package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.CustomerProfile;
import java.math.BigDecimal;

public class CustomerProfileDto {
    private Long id;
    private Long userId;
    private String userName;
    private Integer age;
    private String city;
    private String membershipType;
    private BigDecimal totalSpend;
    private Integer itemsPurchased;
    private BigDecimal avgRating;
    private Boolean discountApplied;
    private String satisfactionLevel;
    private Integer priorPurchases;

    public static CustomerProfileDto from(CustomerProfile cp) {
        CustomerProfileDto dto = new CustomerProfileDto();
        dto.id = cp.getId();
        dto.userId = cp.getOwner().getId();
        dto.userName = cp.getOwner().getFirstName() + " " + cp.getOwner().getLastName();
        dto.age = cp.getAge();
        dto.city = cp.getCity();
        dto.membershipType = cp.getMembershipType() != null ? cp.getMembershipType().name() : null;
        dto.totalSpend = cp.getTotalSpend();
        dto.itemsPurchased = cp.getItemsPurchased();
        dto.avgRating = cp.getAvgRating();
        dto.discountApplied = cp.getDiscountApplied();
        dto.satisfactionLevel = cp.getSatisfactionLevel();
        dto.priorPurchases = cp.getPriorPurchases();
        return dto;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public Integer getAge() { return age; }
    public String getCity() { return city; }
    public String getMembershipType() { return membershipType; }
    public BigDecimal getTotalSpend() { return totalSpend; }
    public Integer getItemsPurchased() { return itemsPurchased; }
    public BigDecimal getAvgRating() { return avgRating; }
    public Boolean getDiscountApplied() { return discountApplied; }
    public String getSatisfactionLevel() { return satisfactionLevel; }
    public Integer getPriorPurchases() { return priorPurchases; }
}
