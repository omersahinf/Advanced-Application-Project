package com.demo.ecommerce.controller;

import com.demo.ecommerce.dto.CreateReviewRequest;
import com.demo.ecommerce.dto.ReviewDto;
import com.demo.ecommerce.security.UserPrincipal;
import com.demo.ecommerce.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    private UserPrincipal getPrincipal(Authentication auth) {
        return (UserPrincipal) auth.getPrincipal();
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ReviewDto>> getProductReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getReviewsByProduct(productId));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<List<ReviewDto>> getMyReviews(Authentication auth) {
        return ResponseEntity.ok(reviewService.getReviewsByUser(getPrincipal(auth).getUserId()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('INDIVIDUAL')")
    public ResponseEntity<ReviewDto> submitReview(@Valid @RequestBody CreateReviewRequest request, Authentication auth) {
        return ResponseEntity.ok(reviewService.submitReview(getPrincipal(auth).getUserId(), request));
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("hasAuthority('CORPORATE')")
    public ResponseEntity<ReviewDto> replyToReview(@PathVariable Long id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication auth) {
        String replyBody = body.get("body");
        if (replyBody == null || replyBody.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(reviewService.replyToReview(id, getPrincipal(auth).getUserId(), replyBody));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('INDIVIDUAL') or hasAuthority('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteReview(@PathVariable Long id, Authentication auth) {
        UserPrincipal p = getPrincipal(auth);
        reviewService.deleteReview(id, p.getUserId(), p.getRole());
        return ResponseEntity.ok(Map.of("message", "Review deleted"));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getAllReviews(@RequestParam(required = false) Integer page,
                                           @RequestParam(required = false, defaultValue = "20") Integer size) {
        if (page != null) {
            return ResponseEntity.ok(reviewService.getAllReviews(PageRequest.of(page, size, Sort.by("id").descending())));
        }
        return ResponseEntity.ok(reviewService.getAllReviews());
    }
}
