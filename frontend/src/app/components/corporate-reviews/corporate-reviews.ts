/**
 * Corporate Reviews — pixel-parity replica of Flower Prototype.html §CorpReviews.
 *
 * Inventory (verbatim from prototype):
 *   Root:         padding 12px 32px 40px, flex column, gap 14.
 *   Review card:  class="card", padding 20.
 *     Header row (space-between, align-center):
 *       Left:  <Avatar name={user} size=30 bg="linear-gradient(135deg,#dfe9e5,#c9ded7)"/>
 *              → name (weight 600) · "on {product} · {fmtDate(date)}"
 *                (11.5px, text-3)
 *       Right: <Stars n={stars}/> <StatusPill status={sentiment}/>
 *     Body:  <p style="color:text-2; marginTop:10">{body}</p>
 *     Reply block (if exists):
 *       padding 12, bg var(--hover), border-left: 3px solid #034f46, radius 6
 *         label row (mono, 11.5px, text-3): "{storeName} replied"
 *         body   (13px)
 *     Else: [Reply] btn-sm btn-primary
 *
 *   Reply dialog (when a review is being replied to):
 *     <Dialog title="Reply to {user}" (width default 480)
 *             footer: [Cancel] [Post reply] (disabled if empty)>
 *       preview block (padding 12, bg var(--hover), radius 10, fontSize 13):
 *         <b>{product}</b> · <Stars n={stars} size=12/>
 *         <div style="color:text-2; marginTop:6">{body}</div>
 *       <label class="label">Your reply</label>
 *       <textarea class="textarea" rows=4/>
 *
 * Prototype string "TechCorp replied" is the seeded store name; our
 * implementation uses the live logged-in corporate's company name.
 * If none is set, we fall back to the generic string "Store replied".
 *
 * ReviewService.getStoreReviews + replyToReview are untouched.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { Review } from '../../models/product.model';
import { FlowerStarsComponent } from '../../shared/flower-stars/flower-stars';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { FlowerDialogComponent } from '../../shared/flower-dialog/flower-dialog';

@Component({
  selector: 'app-corporate-reviews',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    FlowerStarsComponent,
    StatusPillComponent,
    FlowerDialogComponent,
  ],
  template: `
    <div class="page">
      @for (r of reviews(); track r.id) {
        <div class="card review-card">
          <div class="review-head">
            <div class="head-left">
              <span class="avatar" aria-hidden="true">{{ initials(r.userName) }}</span>
              <div class="head-text">
                <div class="reviewer-name">{{ r.userName }}</div>
                <div class="reviewer-meta">
                  on {{ r.productName }} · {{ r.reviewDate | date: 'MMM d, y' }}
                </div>
              </div>
            </div>
            <div class="head-right">
              <flower-stars [value]="r.starRating" [size]="16" />
              <status-pill [status]="r.sentiment" />
            </div>
          </div>

          <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>

          @if (r.corporateReply) {
            <div class="reply-block">
              <div class="reply-label">{{ storeLabel() }} replied</div>
              <div class="reply-body">{{ r.corporateReply }}</div>
            </div>
          } @else {
            <button
              type="button"
              class="btn btn-sm btn-primary reply-btn"
              (click)="openReply(r)"
            >
              Reply
            </button>
          }
        </div>
      }

      @if (reviews().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">⭐</div>
          <div class="empty-title">No reviews yet</div>
          <div>Reviews from customers on your products will show up here.</div>
        </div>
      }

      @if (replyFor(); as current) {
        <flower-dialog
          [title]="'Reply to ' + current.userName"
          (closed)="closeReply()"
        >
          <div class="reply-preview">
            <b>{{ current.productName }}</b>
            <flower-stars [value]="current.starRating" [size]="12" />
            <div class="reply-preview-body">{{ current.reviewBody || 'No comment' }}</div>
          </div>
          <label class="label">Your reply</label>
          <textarea
            class="textarea"
            rows="4"
            [(ngModel)]="replyText"
            [ngModelOptions]="{ standalone: true }"
          ></textarea>
          <div footer>
            <button type="button" class="btn" (click)="closeReply()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!replyText.trim()"
              (click)="submitReply()"
            >
              Post reply
            </button>
          </div>
        </flower-dialog>
      }
    </div>
  `,
  styleUrls: ['./corporate-reviews.scss'],
})
export class CorporateReviewsComponent implements OnInit {
  reviews = signal<Review[]>([]);
  replyFor = signal<Review | null>(null);
  replyText = '';

  /** Label that precedes the reply body, e.g. "TechCorp replied". */
  storeLabel = computed(() => this.auth.currentCompany() || 'Store');

  constructor(
    private reviewService: ReviewService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.reviewService.getStoreReviews().subscribe((r) => this.reviews.set(r));
  }

  initials(name: string | undefined): string {
    if (!name) return '??';
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  openReply(r: Review) {
    this.replyFor.set(r);
    this.replyText = '';
  }

  closeReply() {
    this.replyFor.set(null);
    this.replyText = '';
  }

  submitReply() {
    const current = this.replyFor();
    const text = this.replyText.trim();
    if (!current || !text) return;
    this.reviewService.replyToReview(current.id, text).subscribe(() => {
      this.closeReply();
      this.load();
    });
  }
}
