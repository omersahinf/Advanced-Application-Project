/*
 * Prototype inventory (Flower Prototype.html §IndReviews):
 *  flex column, gap 16
 *  each review → card padding 20:
 *    row(flex, gap 14):
 *      <ProductThumb size=60>
 *      right col flex 1:
 *        header(flex, space-between):
 *          product name (bold)
 *          review date (mono, 11.5px, text-3) on the right
 *        stars row(flex, gap 8):
 *          <Stars n={r.stars}/>
 *          <StatusPill status={r.sentiment}/>
 *          "{helpful}/{total} found helpful" (text-3, 12px)
 *        p (text-2) review body
 *        optional corporate reply block:
 *          padding 12 · bg var(--hover) · border-left 3px #034f46 · radius 6
 *          header (mono, 11.5, text-3): "… replied · {date}"
 *          body (13px)
 *
 * Backend reality:
 *  - Review DTO has `corporateReply` (string) + `replyDate` instead of the
 *    prototype's `{from, body, date}` nested shape, and no seller name.
 *    We label the reply "Seller replied · {date}" to keep the same
 *    visual pattern without faking data.
 *  - `starRating` is the field name on Review (prototype uses `stars`).
 *  - The prototype has no delete CTA on this screen, so we drop ours to
 *    stay faithful; backend deleteReview endpoint is untouched.
 */
import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/product.model';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { FlowerStarsComponent } from '../../shared/flower-stars/flower-stars';
import { ProductHeroComponent } from '../../shared/product-hero/product-hero';

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [DatePipe, StatusPillComponent, FlowerStarsComponent, ProductHeroComponent],
  template: `
    @if (reviews().length > 0) {
      <div class="reviews-list">
        @for (r of reviews(); track r.id) {
          <article class="review-card card">
            <div class="review-row">
              <div class="thumb-box">
                <product-hero [name]="r.productName" [ratio]="1" [size]="32" />
              </div>
              <div class="review-main">
                <header class="review-header">
                  <div class="product-name">{{ r.productName }}</div>
                  <div class="review-date">{{ r.reviewDate | date: 'mediumDate' }}</div>
                </header>
                <div class="review-meta-row">
                  <flower-stars [value]="r.starRating" [size]="13" />
                  <status-pill [status]="r.sentiment" />
                  <span class="helpful">
                    {{ r.helpfulVotes }}/{{ r.totalVotes }} found helpful
                  </span>
                </div>
                <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>

                @if (r.corporateReply) {
                  <div class="corporate-reply">
                    <div class="reply-head">
                      Seller replied
                      @if (r.replyDate) {
                        · {{ r.replyDate | date: 'mediumDate' }}
                      }
                    </div>
                    <div class="reply-body">{{ r.corporateReply }}</div>
                  </div>
                }
              </div>
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="empty-state card">
        <div class="empty-icon" aria-hidden="true">⭐</div>
        <div class="empty-title">No reviews yet</div>
        <div>Browse products and share your experience to leave a review.</div>
      </div>
    }
  `,
  styleUrls: ['./my-reviews.scss'],
})
export class MyReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);

  constructor(private reviewService: ReviewService) {}

  ngOnInit() {
    this.reviewService.getMyReviews().subscribe((r) => this.reviews.set(r));
  }
}
