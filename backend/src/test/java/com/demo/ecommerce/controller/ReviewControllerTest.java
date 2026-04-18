package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.CreateReviewRequest;
import com.demo.ecommerce.dto.ReviewDto;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Review;
import com.demo.ecommerce.entity.Sentiment;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.ReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private ReviewController reviewController;

    private ReviewDto sample;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(42L);
        user.setFirstName("Ada");
        user.setLastName("Lovelace");

        Product product = new Product();
        product.setId(7L);
        product.setName("Mechanical Keyboard");

        Review review = new Review();
        review.setId(1L);
        review.setUser(user);
        review.setProduct(product);
        review.setStarRating(5);
        review.setSentiment(Sentiment.POSITIVE);
        sample = ReviewDto.from(review);

        UserPrincipal principal = new UserPrincipal(42L, "ada@x.com", "INDIVIDUAL");
        auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    @Test
    void getProductReviews_returnsList() {
        when(reviewService.getReviewsByProduct(7L)).thenReturn(List.of(sample));

        ResponseEntity<List<ReviewDto>> response = reviewController.getProductReviews(7L);

        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
        assertEquals(5, response.getBody().get(0).getStarRating());
    }

    @Test
    void getMyReviews_scopesByUserId() {
        when(reviewService.getReviewsByUser(42L)).thenReturn(List.of(sample));

        ResponseEntity<List<ReviewDto>> response = reviewController.getMyReviews(auth);

        assertEquals(200, response.getStatusCode().value());
        verify(reviewService).getReviewsByUser(42L);
    }

    @Test
    void submitReview_delegatesToService() {
        CreateReviewRequest req = new CreateReviewRequest();
        when(reviewService.submitReview(eq(42L), any(CreateReviewRequest.class))).thenReturn(sample);

        ResponseEntity<ReviewDto> response = reviewController.submitReview(req, auth);

        assertEquals(200, response.getStatusCode().value());
        verify(reviewService).submitReview(42L, req);
    }

    @Test
    void replyToReview_withBody_succeeds() {
        when(reviewService.replyToReview(1L, 42L, "Thank you!")).thenReturn(sample);

        ResponseEntity<ReviewDto> response = reviewController.replyToReview(
                1L, Map.of("body", "Thank you!"), auth);

        assertEquals(200, response.getStatusCode().value());
        verify(reviewService).replyToReview(1L, 42L, "Thank you!");
    }

    @Test
    void replyToReview_emptyBody_returns400() {
        ResponseEntity<ReviewDto> response = reviewController.replyToReview(
                1L, Map.of("body", ""), auth);

        assertEquals(400, response.getStatusCode().value());
        verifyNoInteractions(reviewService);
    }
}
