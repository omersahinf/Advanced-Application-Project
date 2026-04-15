package com.demo.ecommerce.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", indexes = {
    @Index(name = "idx_review_user", columnList = "user_id"),
    @Index(name = "idx_review_product", columnList = "product_id"),
    @Index(name = "idx_review_rating", columnList = "star_rating")
})
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "star_rating", nullable = false)
    private Integer starRating; // 1-5

    @Column(length = 2000)
    private String reviewBody;

    @Enumerated(EnumType.STRING)
    private Sentiment sentiment;

    private Integer helpfulVotes;

    private Integer totalVotes;

    @Column(length = 1000)
    private String corporateReply;

    private LocalDateTime replyDate;

    @Column(name = "review_date")
    private LocalDateTime reviewDate;

    @PrePersist
    protected void onCreate() {
        if (reviewDate == null) {
            reviewDate = LocalDateTime.now();
        }
    }

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Integer getStarRating() { return starRating; }
    public void setStarRating(Integer starRating) { this.starRating = starRating; }

    public String getReviewBody() { return reviewBody; }
    public void setReviewBody(String reviewBody) { this.reviewBody = reviewBody; }

    public Sentiment getSentiment() { return sentiment; }
    public void setSentiment(Sentiment sentiment) { this.sentiment = sentiment; }

    public Integer getHelpfulVotes() { return helpfulVotes; }
    public void setHelpfulVotes(Integer helpfulVotes) { this.helpfulVotes = helpfulVotes; }

    public Integer getTotalVotes() { return totalVotes; }
    public void setTotalVotes(Integer totalVotes) { this.totalVotes = totalVotes; }

    public LocalDateTime getReviewDate() { return reviewDate; }
    public void setReviewDate(LocalDateTime reviewDate) { this.reviewDate = reviewDate; }

    public String getCorporateReply() { return corporateReply; }
    public void setCorporateReply(String corporateReply) { this.corporateReply = corporateReply; }

    public LocalDateTime getReplyDate() { return replyDate; }
    public void setReplyDate(LocalDateTime replyDate) { this.replyDate = replyDate; }
}
