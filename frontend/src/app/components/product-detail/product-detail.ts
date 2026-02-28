import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { OrderService } from '../../services/order.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, Review } from '../../models/product.model';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <a routerLink="/products" class="back-link">← Back to Products</a>

      @if (product(); as p) {
        <div class="product-hero card">
          <div class="product-category">{{ p.category || 'Uncategorized' }}</div>
          <h1>{{ p.name }}</h1>
          <p class="product-desc">{{ p.description }}</p>

          <div class="product-meta">
            <span class="price">\${{ p.price | number:'1.2-2' }}</span>
            <span class="stock" [class.low]="p.stock < 10">{{ p.stock }} in stock</span>
            <span class="store">by {{ p.storeName }}</span>
            @if (p.sku) { <span class="sku">SKU: {{ p.sku }}</span> }
          </div>

          @if (auth.isIndividual()) {
            <div class="order-section">
              <div class="qty-row">
                <label>Quantity:</label>
                <input type="number" min="1" [max]="p.stock" [(ngModel)]="qty" class="qty-input">
                <button class="btn btn-secondary" (click)="addToCart(p)" [disabled]="addingToCart()">
                  {{ addingToCart() ? 'Adding...' : 'Add to Cart' }}
                </button>
                <button class="btn btn-primary" (click)="placeOrder(p)" [disabled]="ordering()">
                  {{ ordering() ? 'Placing...' : 'Buy Now' }}
                </button>
              </div>
              @if (orderMsg()) {
                <div class="order-msg" [class.success]="!orderError()">{{ orderMsg() }}</div>
              }
            </div>
          }
        </div>

        <div class="reviews-section">
          <div class="reviews-header">
            <h2>Reviews ({{ reviews().length }})</h2>
            <span class="avg-rating">
              Avg: {{ avgRating() | number:'1.1-1' }} ★
            </span>
          </div>

          @if (auth.isIndividual()) {
            <div class="review-form card">
              <h3>Write a Review</h3>
              <div class="star-input">
                @for (s of [1,2,3,4,5]; track s) {
                  <button class="star-btn" [class.active]="s <= newRating" (click)="newRating = s">
                    {{ s <= newRating ? '★' : '☆' }}
                  </button>
                }
              </div>
              <textarea [(ngModel)]="newBody" placeholder="Share your experience..." rows="3"></textarea>
              <button class="btn btn-primary" (click)="submitReview(p.id)" [disabled]="submitting()">Submit Review</button>
            </div>
          }

          @for (r of reviews(); track r.id) {
            <div class="review-card card">
              <div class="review-top">
                <span class="review-stars">{{ getStars(r.starRating) }}</span>
                <span class="review-user">{{ r.userName }}</span>
                <span class="review-date">{{ r.reviewDate | date:'mediumDate' }}</span>
              </div>
              <p class="review-body">{{ r.reviewBody || 'No comment' }}</p>
            </div>
          }

          @if (reviews().length === 0) {
            <p class="no-reviews">No reviews yet. Be the first to review!</p>
          }
        </div>
      } @else {
        <div class="loading">Loading product...</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 24px; }
    .back-link { display: inline-block; margin-bottom: 16px; font-size: 14px; color: #4361ee; }
    .product-hero { padding: 28px; margin-bottom: 28px; }
    .product-category { font-size: 11px; font-weight: 600; color: #4361ee; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    h1 { font-size: 28px; margin-bottom: 12px; }
    .product-desc { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px; }
    .product-meta { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    .price { font-size: 28px; font-weight: 700; color: #16a34a; }
    .stock { font-size: 14px; font-weight: 500; color: #16a34a; }
    .stock.low { color: #dc2626; }
    .store, .sku { font-size: 13px; color: #9ca3af; }
    .order-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
    .qty-row { display: flex; align-items: center; gap: 12px; }
    .qty-row label { font-size: 14px; font-weight: 600; }
    .qty-input { width: 80px; text-align: center; }
    .order-msg { margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-size: 13px; background: #fef2f2; color: #dc2626; }
    .order-msg.success { background: #f0fdf4; color: #16a34a; }
    .btn-secondary { background: #4361ee; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-secondary:disabled { opacity: 0.5; }
    .reviews-section { margin-top: 8px; }
    .reviews-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .reviews-header h2 { font-size: 20px; font-weight: 700; }
    .avg-rating { font-size: 16px; color: #f59e0b; font-weight: 600; }
    .review-form { padding: 20px; margin-bottom: 16px; }
    .review-form h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .star-input { display: flex; gap: 4px; margin-bottom: 12px; }
    .star-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: #d1d5db; transition: color 0.1s; }
    .star-btn.active { color: #f59e0b; }
    textarea { margin-bottom: 12px; }
    .review-card { padding: 16px; margin-bottom: 8px; }
    .review-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .review-stars { font-size: 16px; color: #f59e0b; }
    .review-user { font-weight: 600; font-size: 13px; }
    .review-date { font-size: 12px; color: #9ca3af; }
    .review-body { font-size: 13px; color: #4b5563; line-height: 1.5; }
    .no-reviews { text-align: center; color: #9ca3af; padding: 20px; }
    .loading { text-align: center; padding: 60px; color: #64748b; }
  `]
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

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private reviewService: ReviewService,
    private orderService: OrderService,
    private cartService: CartService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productService.getProduct(id).subscribe(p => this.product.set(p));
    this.loadReviews(id);
  }

  loadReviews(productId: number) {
    this.reviewService.getProductReviews(productId).subscribe(r => {
      this.reviews.set(r);
      if (r.length > 0) {
        this.avgRating.set(r.reduce((sum, rv) => sum + rv.starRating, 0) / r.length);
      }
    });
  }

  getStars(n: number): string { return '★'.repeat(n) + '☆'.repeat(5 - n); }

  placeOrder(p: Product) {
    this.ordering.set(true);
    this.orderService.placeOrder({
      storeId: p.storeId,
      paymentMethod: 'CREDIT_CARD',
      items: [{ productId: p.id, quantity: this.qty }]
    }).subscribe({
      next: (o) => {
        this.orderMsg.set(`Order #${o.id} placed successfully! Total: $${o.grandTotal}`);
        this.orderError.set(false);
        this.ordering.set(false);
      },
      error: (err) => {
        this.orderMsg.set(err.error?.error || 'Failed to place order');
        this.orderError.set(true);
        this.ordering.set(false);
      }
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
      }
    });
  }

  submitReview(productId: number) {
    this.submitting.set(true);
    this.reviewService.submitReview({
      productId,
      starRating: this.newRating,
      reviewBody: this.newBody
    }).subscribe({
      next: () => {
        this.newBody = '';
        this.newRating = 5;
        this.submitting.set(false);
        this.loadReviews(productId);
      },
      error: () => this.submitting.set(false)
    });
  }
}
