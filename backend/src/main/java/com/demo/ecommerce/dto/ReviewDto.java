package com.demo.ecommerce.dto;

import com.demo.ecommerce.entity.Review;
import java.time.LocalDateTime;

public class ReviewDto {
    private Long id;
    private Long userId;
    private String userName;
    private Long productId;
    private String productName;
    private Integer starRating;
    private String reviewBody;
    private String sentiment;
    private Integer helpfulVotes;
    private Integer totalVotes;
    private LocalDateTime reviewDate;
    private String corporateReply;
    private LocalDateTime replyDate;

    public static ReviewDto from(Review r) {
        ReviewDto dto = new ReviewDto();
        dto.id = r.getId();
        dto.userId = r.getUser().getId();
        dto.userName = r.getUser().getFirstName() + " " + r.getUser().getLastName();
        dto.productId = r.getProduct().getId();
        dto.productName = r.getProduct().getName();
        dto.starRating = r.getStarRating();
        dto.reviewBody = r.getReviewBody();
        dto.sentiment = r.getSentiment().name();
        dto.helpfulVotes = r.getHelpfulVotes();
        dto.totalVotes = r.getTotalVotes();
        dto.reviewDate = r.getReviewDate();
        dto.corporateReply = r.getCorporateReply();
        dto.replyDate = r.getReplyDate();
        return dto;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public Integer getStarRating() { return starRating; }
    public String getReviewBody() { return reviewBody; }
    public String getSentiment() { return sentiment; }
    public Integer getHelpfulVotes() { return helpfulVotes; }
    public Integer getTotalVotes() { return totalVotes; }
    public LocalDateTime getReviewDate() { return reviewDate; }
    public String getCorporateReply() { return corporateReply; }
    public LocalDateTime getReplyDate() { return replyDate; }
}
