import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Review, CreateReviewRequest } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {

  constructor(private http: HttpClient) {}

  getProductReviews(productId: number) {
    return this.http.get<Review[]>(`/api/reviews/product/${productId}`);
  }

  getMyReviews() {
    return this.http.get<Review[]>('/api/reviews/my');
  }

  submitReview(req: CreateReviewRequest) {
    return this.http.post<Review>('/api/reviews', req);
  }

  deleteReview(id: number) {
    return this.http.delete(`/api/reviews/${id}`);
  }

  // Corporate
  getStoreReviews() {
    return this.http.get<Review[]>('/api/store/my/reviews');
  }

  replyToReview(reviewId: number, body: string) {
    return this.http.post(`/api/reviews/${reviewId}/reply`, { body });
  }
}
