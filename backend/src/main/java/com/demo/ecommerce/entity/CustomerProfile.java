package com.demo.ecommerce.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User owner;

    @Column(columnDefinition = "INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 120))")
    private Integer age;

    private String city;

    @Enumerated(EnumType.STRING)
    private MembershipType membershipType;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalSpend;

    private Integer itemsPurchased;

    @Column(precision = 3, scale = 2,
        columnDefinition = "DECIMAL(3,2) CHECK (avg_rating IS NULL OR (avg_rating >= 0 AND avg_rating <= 5))")
    private BigDecimal avgRating;

    private Boolean discountApplied;

    private String satisfactionLevel; // Satisfied, Neutral, Unsatisfied

    private Integer priorPurchases;

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public MembershipType getMembershipType() { return membershipType; }
    public void setMembershipType(MembershipType membershipType) { this.membershipType = membershipType; }

    public BigDecimal getTotalSpend() { return totalSpend; }
    public void setTotalSpend(BigDecimal totalSpend) { this.totalSpend = totalSpend; }

    public Integer getItemsPurchased() { return itemsPurchased; }
    public void setItemsPurchased(Integer itemsPurchased) { this.itemsPurchased = itemsPurchased; }

    public BigDecimal getAvgRating() { return avgRating; }
    public void setAvgRating(BigDecimal avgRating) { this.avgRating = avgRating; }

    public Boolean getDiscountApplied() { return discountApplied; }
    public void setDiscountApplied(Boolean discountApplied) { this.discountApplied = discountApplied; }

    public String getSatisfactionLevel() { return satisfactionLevel; }
    public void setSatisfactionLevel(String satisfactionLevel) { this.satisfactionLevel = satisfactionLevel; }

    public Integer getPriorPurchases() { return priorPurchases; }
    public void setPriorPurchases(Integer priorPurchases) { this.priorPurchases = priorPurchases; }
}
