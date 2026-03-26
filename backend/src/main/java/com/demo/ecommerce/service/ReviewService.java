package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateReviewRequest;
import com.demo.ecommerce.dto.ReviewDto;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Review;
import com.demo.ecommerce.entity.Sentiment;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.exception.ResourceNotFoundException;
import com.demo.ecommerce.exception.UnauthorizedOperationException;
import com.demo.ecommerce.repository.ProductRepository;
import com.demo.ecommerce.repository.ReviewRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public ReviewService(ReviewRepository reviewRepository, ProductRepository productRepository,
                         UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public List<ReviewDto> getReviewsByProduct(Long productId) {
        return reviewRepository.findByProductId(productId).stream()
                .map(ReviewDto::from)
                .collect(Collectors.toList());
    }

    public List<ReviewDto> getReviewsByUser(Long userId) {
        return reviewRepository.findByUserId(userId).stream()
                .map(ReviewDto::from)
                .collect(Collectors.toList());
    }

    public List<ReviewDto> getReviewsByStoreOwner(Long ownerId) {
        return reviewRepository.findByProductStoreOwnerId(ownerId).stream()
                .map(ReviewDto::from)
                .collect(Collectors.toList());
    }

    public List<ReviewDto> getAllReviews() {
        return reviewRepository.findAll().stream()
                .map(ReviewDto::from)
                .collect(Collectors.toList());
    }

    public Page<ReviewDto> getAllReviews(Pageable pageable) {
        return reviewRepository.findAll(pageable).map(ReviewDto::from);
    }

    @Transactional
    public ReviewDto submitReview(Long userId, CreateReviewRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        Review review = new Review();
        review.setUser(user);
        review.setProduct(product);
        review.setStarRating(req.getStarRating());
        review.setReviewBody(req.getReviewBody());
        review.setHelpfulVotes(0);
        review.setTotalVotes(0);

        // Simple sentiment based on rating
        if (req.getStarRating() >= 4) {
            review.setSentiment(Sentiment.POSITIVE);
        } else if (req.getStarRating() == 3) {
            review.setSentiment(Sentiment.NEUTRAL);
        } else {
            review.setSentiment(Sentiment.NEGATIVE);
        }

        return ReviewDto.from(reviewRepository.save(review));
    }

    @Transactional
    public ReviewDto replyToReview(Long reviewId, Long ownerId, String replyBody) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        // Verify the corporate user owns the store that sells this product
        if (!review.getProduct().getStore().getOwner().getId().equals(ownerId)) {
            throw new UnauthorizedOperationException("Not authorized to reply to this review");
        }
        review.setCorporateReply(replyBody);
        review.setReplyDate(java.time.LocalDateTime.now());
        return ReviewDto.from(reviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(Long reviewId, Long userId, String role) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        if (!"ADMIN".equals(role) && !review.getUser().getId().equals(userId)) {
            throw new UnauthorizedOperationException("Not authorized to delete this review");
        }
        reviewRepository.delete(review);
    }
}
