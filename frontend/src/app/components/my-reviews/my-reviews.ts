import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/product.model';

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="reviews-list">
        @for (r of reviews(); track r.id) {
          <div class="review-card card">
            <div class="review-head">
              <div>
                <div class="stars" aria-hidden="true">{{ getStars(r.starRating) }}</div>
                <h3>{{ r.productName }}</h3>
              </div>
              <div class="review-actions">
                <span class="sentiment" [class]="'sent-' + r.sentiment.toLowerCase()">
                  {{ r.sentiment }}
                </span>
                <button class="btn-xs-danger" type="button" (click)="remove(r.id)">
                  Delete
                </button>
              </div>
            </div>
            <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>
            <div class="review-meta">
              {{ r.reviewDate | date: 'mediumDate' }} · {{ r.helpfulVotes }}/{{ r.totalVotes }}
              found helpful
            </div>
          </div>
        }
      </div>
      @if (reviews().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">⭐</div>
          <div class="empty-title">No reviews yet</div>
          <div>Browse products and share your experience to leave a review.</div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./my-reviews.scss'],
})
export class MyReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);

  constructor(private reviewService: ReviewService) {}

  ngOnInit() {
    this.reviewService.getMyReviews().subscribe((r) => this.reviews.set(r));
  }

  getStars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  remove(id: number) {
    if (confirm('Delete this review?')) {
      this.reviewService.deleteReview(id).subscribe(() => {
        this.reviewService.getMyReviews().subscribe((r) => this.reviews.set(r));
      });
    }
  }
}
