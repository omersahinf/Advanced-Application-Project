import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/product.model';

@Component({
  selector: 'app-corporate-reviews',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page">
      <div class="reviews-grid">
        @for (r of reviews(); track r.id) {
          <div class="review-card">
            <div class="review-head">
              <div class="stars" aria-hidden="true">{{ getStars(r.starRating) }}</div>
              <span class="sentiment" [class]="'sent-' + r.sentiment.toLowerCase()">
                {{ r.sentiment }}
              </span>
            </div>
            <div class="review-product">{{ r.productName }}</div>
            <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>
            <div class="review-meta">
              <span>By {{ r.userName }}</span>
              <span>{{ r.reviewDate | date: 'mediumDate' }}</span>
              <span>{{ r.helpfulVotes }}/{{ r.totalVotes }} helpful</span>
            </div>
            @if (r.corporateReply) {
              <div class="existing-reply"><strong>Your reply:</strong> {{ r.corporateReply }}</div>
            } @else {
              <div class="reply-section">
                <input
                  class="reply-input"
                  placeholder="Write a reply…"
                  [(ngModel)]="replyTexts[r.id]"
                />
                <button
                  class="btn-reply"
                  type="button"
                  (click)="submitReply(r.id)"
                  [disabled]="!replyTexts[r.id]?.trim()"
                >
                  Reply
                </button>
              </div>
            }
          </div>
        }
      </div>
      @if (reviews().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">⭐</div>
          <div class="empty-title">No reviews yet</div>
          <div>Reviews from customers on your products will show up here.</div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./corporate-reviews.scss'],
})
export class CorporateReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  replyTexts: Record<number, string> = {};

  constructor(private reviewService: ReviewService) {}

  ngOnInit() {
    this.reviewService.getStoreReviews().subscribe((r) => this.reviews.set(r));
  }

  getStars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  submitReply(reviewId: number) {
    const text = this.replyTexts[reviewId]?.trim();
    if (!text) return;
    this.reviewService.replyToReview(reviewId, text).subscribe(() => {
      this.replyTexts[reviewId] = '';
      this.reviewService.getStoreReviews().subscribe((r) => this.reviews.set(r));
    });
  }
}
