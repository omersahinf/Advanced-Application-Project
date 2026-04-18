import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/product.model';

@Component({
  selector: 'app-corporate-reviews',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Customer Reviews</h1>
        <p class="subtitle">Reviews for your store's products</p>
      </div>

      <div class="reviews-grid">
        @for (r of reviews(); track r.id) {
          <div class="review-card card">
            <div class="review-header">
              <div class="stars">{{ getStars(r.starRating) }}</div>
              <span class="sentiment" [class]="'sent-' + r.sentiment.toLowerCase()">{{
                r.sentiment
              }}</span>
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
                  placeholder="Write a reply..."
                  [(ngModel)]="replyTexts[r.id]"
                />
                <button
                  class="btn-reply"
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
        <div class="empty card">No reviews yet</div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
      }
      .page-header {
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .subtitle {
        color: #666;
        font-size: 14px;
        margin-top: 4px;
      }
      .reviews-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 16px;
      }
      .review-card {
        padding: 20px;
      }
      .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .stars {
        font-size: 18px;
        color: #d97706;
      }
      .sentiment {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
        text-transform: uppercase;
      }
      .sent-positive {
        background: #dcfce7;
        color: #16a34a;
      }
      .sent-neutral {
        background: #fef3c7;
        color: #d97706;
      }
      .sent-negative {
        background: #fee2e2;
        color: #dc2626;
      }
      .review-product {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 8px;
        color: #1a1a1a;
      }
      .review-body {
        color: #666;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 12px;
      }
      .review-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #999;
      }
      .reply-section {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #d5d5c0;
      }
      .reply-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #c8c8b4;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        background: #ffffeb;
        color: #1a1a1a;
      }
      .btn-reply {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: #034f46;
        color: white;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
      }
      .btn-reply:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-reply:hover:not(:disabled) {
        background: #034f46;
      }
      .existing-reply {
        margin-top: 12px;
        padding: 10px 14px;
        background: #dcfce7;
        border-radius: 8px;
        font-size: 13px;
        color: #16a34a;
        border-left: 3px solid #16a34a;
      }
      .empty {
        padding: 40px;
        text-align: center;
        color: #666;
      }
    `,
  ],
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
