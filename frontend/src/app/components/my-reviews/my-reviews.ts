import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/product.model';

@Component({
  selector: 'app-my-reviews',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>My Reviews</h1>
      </div>

      <div class="reviews-list">
        @for (r of reviews(); track r.id) {
          <div class="review-card card">
            <div class="review-header">
              <div>
                <div class="stars">{{ getStars(r.starRating) }}</div>
                <h3>{{ r.productName }}</h3>
              </div>
              <div class="review-actions">
                <span class="sentiment" [class]="'sent-' + r.sentiment.toLowerCase()">{{ r.sentiment }}</span>
                <button class="btn-xs danger" (click)="remove(r.id)">Delete</button>
              </div>
            </div>
            <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>
            <div class="review-meta">
              {{ r.reviewDate | date:'mediumDate' }} &middot; {{ r.helpfulVotes }}/{{ r.totalVotes }} found helpful
            </div>
          </div>
        }
      </div>
      @if (reviews().length === 0) {
        <div class="empty card">You haven't written any reviews yet. Browse products to leave a review!</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 24px; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; }
    .review-card { padding: 20px; margin-bottom: 12px; }
    .review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .review-header h3 { font-size: 15px; font-weight: 600; margin-top: 4px; }
    .stars { font-size: 18px; color: #f59e0b; }
    .review-actions { display: flex; align-items: center; gap: 8px; }
    .sentiment { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; }
    .sent-positive { background: #dcfce7; color: #16a34a; }
    .sent-neutral { background: #fef3c7; color: #d97706; }
    .sent-negative { background: #fee2e2; color: #dc2626; }
    .review-body { color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 10px; }
    .review-meta { font-size: 12px; color: #9ca3af; }
    .btn-xs { padding: 4px 10px; border: 1px solid #fecaca; border-radius: 4px; background: white; font-size: 11px; cursor: pointer; color: #dc2626; }
    .btn-xs:hover { background: #fef2f2; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; }
  `]
})
export class MyReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);

  constructor(private reviewService: ReviewService) {}

  ngOnInit() { this.reviewService.getMyReviews().subscribe(r => this.reviews.set(r)); }

  getStars(n: number): string { return '★'.repeat(n) + '☆'.repeat(5 - n); }

  remove(id: number) {
    if (confirm('Delete this review?')) {
      this.reviewService.deleteReview(id).subscribe(() => {
        this.reviewService.getMyReviews().subscribe(r => this.reviews.set(r));
      });
    }
  }
}
