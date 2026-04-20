import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { OrderService } from '../../services/order.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, Review } from '../../models/product.model';
import { productEmoji } from '../../shared/product-emoji';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <a routerLink="/products" class="back-link">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Products
      </a>

      @if (product(); as p) {
        <div class="detail-card card">
          <div class="hero-box" aria-hidden="true">{{ heroFor(p) }}</div>

          <div class="detail-body">
            <div class="product-category">{{ p.category || 'Uncategorized' }}</div>
            <h1>{{ p.name }}</h1>
            <p class="product-desc">{{ p.description }}</p>

            <div class="product-meta">
              <span class="price">\${{ p.price | number: '1.2-2' }}</span>
              <span class="stock" [class.low]="p.stock < 10">{{ p.stock }} in stock</span>
              <span class="store">by {{ p.storeName }}</span>
              @if (p.sku) {
                <span class="sku">SKU: {{ p.sku }}</span>
              }
            </div>

            @if (auth.isIndividual()) {
              <div class="order-section">
                <div class="qty-row">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    [max]="p.stock"
                    [(ngModel)]="qty"
                    class="qty-input"
                  />
                  <button
                    class="btn"
                    type="button"
                    (click)="addToCart(p)"
                    [disabled]="addingToCart()"
                  >
                    {{ addingToCart() ? 'Adding…' : 'Add to Cart' }}
                  </button>
                </div>
                <div class="pay-row">
                  <div class="pay-seg" role="radiogroup" aria-label="Payment method">
                    <label [class.active]="paymentMethod === 'STRIPE'">
                      <input type="radio" name="pay" value="STRIPE" [(ngModel)]="paymentMethod" />
                      Card (Stripe)
                    </label>
                    <label [class.active]="paymentMethod === 'COD'">
                      <input type="radio" name="pay" value="COD" [(ngModel)]="paymentMethod" />
                      Cash on Delivery
                    </label>
                  </div>
                  <button
                    class="btn btn-primary"
                    type="button"
                    (click)="placeOrder(p)"
                    [disabled]="ordering()"
                  >
                    {{ ordering() ? 'Placing…' : 'Buy Now' }}
                  </button>
                </div>
                @if (orderMsg()) {
                  <div class="order-msg" [class.success]="!orderError()">{{ orderMsg() }}</div>
                }
              </div>
            }
          </div>
        </div>

        <div class="reviews-section">
          <div class="reviews-header">
            <h2>Reviews ({{ reviews().length }})</h2>
            <span class="avg-rating">★ {{ avgRating() | number: '1.1-1' }}</span>
          </div>

          @if (auth.isIndividual()) {
            <div class="review-form card">
              <h3>Write a review</h3>
              <div class="star-input">
                @for (s of [1, 2, 3, 4, 5]; track s) {
                  <button
                    class="star-btn"
                    type="button"
                    [class.active]="s <= newRating"
                    (click)="newRating = s"
                    [attr.aria-label]="s + ' stars'"
                  >
                    {{ s <= newRating ? '★' : '☆' }}
                  </button>
                }
              </div>
              <textarea
                [(ngModel)]="newBody"
                placeholder="Share your experience…"
                rows="3"
              ></textarea>
              <button
                class="btn btn-primary"
                type="button"
                (click)="submitReview(p.id)"
                [disabled]="submitting()"
              >
                Submit review
              </button>
            </div>
          }

          @for (r of reviews(); track r.id) {
            <div class="review-card card">
              <div class="review-top">
                <span class="review-stars">{{ getStars(r.starRating) }}</span>
                <span class="review-user">{{ r.userName }}</span>
                <span class="review-date">{{ r.reviewDate | date: 'mediumDate' }}</span>
              </div>
              <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>
            </div>
          }

          @if (reviews().length === 0) {
            <p class="no-reviews">No reviews yet. Be the first to review!</p>
          }
        </div>
      } @else {
        <div class="loading">Loading product…</div>
      }
    </div>
  `,
  styleUrls: ['./product-detail.scss'],
})
export class ProductDetailComponent implements OnInit {
  product = signal<Product | null>(null);
  reviews = signal<Review[]>([]);
  avgRating = signal(0);
  qty = 1;
  ordering = signal(false);
  orderMsg = signal('');
  orderError = signal(false);
  newRating = 5;
  newBody = '';
  submitting = signal(false);
  addingToCart = signal(false);
  cartMsg = signal('');
  paymentMethod: 'STRIPE' | 'COD' = 'STRIPE';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private reviewService: ReviewService,
    private orderService: OrderService,
    private cartService: CartService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productService.getProduct(id).subscribe((p) => this.product.set(p));
    this.loadReviews(id);
  }

  heroFor(p: Product) {
    return productEmoji(p.name, p.category);
  }

  loadReviews(productId: number) {
    this.reviewService.getProductReviews(productId).subscribe((r) => {
      this.reviews.set(r);
      if (r.length > 0) {
        this.avgRating.set(r.reduce((sum, rv) => sum + rv.starRating, 0) / r.length);
      }
    });
  }

  getStars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  placeOrder(p: Product) {
    this.ordering.set(true);
    const isCod = this.paymentMethod === 'COD';
    this.orderService
      .placeOrder({
        storeId: p.storeId,
        paymentMethod: this.paymentMethod,
        items: [{ productId: p.id, quantity: this.qty }],
      })
      .subscribe({
        next: (o) => {
          this.ordering.set(false);
          if (isCod) {
            this.orderMsg.set('Order placed! Redirecting to My Orders…');
            this.orderError.set(false);
            setTimeout(() => this.router.navigate(['/orders']), 800);
          } else {
            this.router.navigate(['/checkout', o.id]);
          }
        },
        error: (err) => {
          this.orderMsg.set(err.error?.error || 'Failed to place order');
          this.orderError.set(true);
          this.ordering.set(false);
        },
      });
  }

  addToCart(p: Product) {
    this.addingToCart.set(true);
    this.cartService.addToCart(p.id, this.qty).subscribe({
      next: () => {
        this.orderMsg.set('Added to cart!');
        this.orderError.set(false);
        this.addingToCart.set(false);
      },
      error: (err) => {
        this.orderMsg.set(err.error?.error || 'Failed to add to cart');
        this.orderError.set(true);
        this.addingToCart.set(false);
      },
    });
  }

  submitReview(productId: number) {
    this.submitting.set(true);
    this.reviewService
      .submitReview({
        productId,
        starRating: this.newRating,
        reviewBody: this.newBody,
      })
      .subscribe({
        next: () => {
          this.newBody = '';
          this.newRating = 5;
          this.submitting.set(false);
          this.loadReviews(productId);
        },
        error: () => this.submitting.set(false),
      });
  }
}
