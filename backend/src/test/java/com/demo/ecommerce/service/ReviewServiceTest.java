package com.demo.ecommerce.service;

import com.demo.ecommerce.dto.CreateReviewRequest;
import com.demo.ecommerce.entity.Product;
import com.demo.ecommerce.entity.Review;
import com.demo.ecommerce.entity.RoleType;
import com.demo.ecommerce.entity.Sentiment;
import com.demo.ecommerce.entity.Store;
import com.demo.ecommerce.entity.User;
import com.demo.ecommerce.repository.ProductRepository;
import com.demo.ecommerce.repository.ReviewRepository;
import com.demo.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private ReviewService reviewService;

    private User user;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setFirstName("Test");
        user.setLastName("User");
        user.setRoleType(RoleType.INDIVIDUAL);

        product = new Product();
        product.setId(10L);
        product.setName("Demo Product");
    }

    @Test
    void submitReview_escapesHtmlPayload() {
        CreateReviewRequest req = new CreateReviewRequest();
        req.setProductId(10L);
        req.setStarRating(5);
        req.setReviewBody("<img src=x onerror=alert(1)> Great");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> {
            Review review = inv.getArgument(0);
            review.setId(100L);
            return review;
        });

        reviewService.submitReview(1L, req);

        ArgumentCaptor<Review> captor = ArgumentCaptor.forClass(Review.class);
        verify(reviewRepository).save(captor.capture());
        assertEquals("&lt;img src=x onerror=alert(1)&gt; Great", captor.getValue().getReviewBody());
    }

    @Test
    void replyToReview_escapesHtmlPayload() {
        User owner = new User();
        owner.setId(2L);
        owner.setFirstName("Store");
        owner.setLastName("Owner");
        owner.setRoleType(RoleType.CORPORATE);

        Store store = new Store();
        store.setId(3L);
        store.setOwner(owner);
        product.setStore(store);

        Review review = new Review();
        review.setId(200L);
        review.setUser(user);
        review.setProduct(product);
        review.setStarRating(4);
        review.setSentiment(Sentiment.POSITIVE);

        when(reviewRepository.findById(200L)).thenReturn(Optional.of(review));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));

        reviewService.replyToReview(200L, 2L, "<script>alert(1)</script>");

        ArgumentCaptor<Review> captor = ArgumentCaptor.forClass(Review.class);
        verify(reviewRepository).save(captor.capture());
        assertEquals("&lt;script&gt;alert(1)&lt;/script&gt;", captor.getValue().getCorporateReply());
    }
}
