import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { CartService } from '../../services/cart.service';
import { Order } from '../../models/product.model';

declare const Stripe: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="checkout-page">
      <h2>Checkout - Payment</h2>

      @if (loading) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading order details...</p>
        </div>
      } @else if (errorMsg && !order) {
        <div class="error-box">
          <p>{{ errorMsg }}</p>
          <a routerLink="/orders" class="btn-back">Back to Orders</a>
        </div>
      } @else if (order) {
        <div class="checkout-layout">
          <div class="order-details">
            <h3>Order #{{ order.id }}</h3>
            <div class="detail-row">
              <span>Store</span>
              <span>{{ order.storeName }}</span>
            </div>
            <div class="detail-row">
              <span>Status</span>
              <span class="badge">{{ order.status }}</span>
            </div>
            <hr />
            @for (item of order.items; track item.id) {
              <div class="line-item">
                <span class="item-name">{{ item.productName }} x{{ item.quantity }}</span>
                <span class="item-price">\${{ (item.price * item.quantity).toFixed(2) }}</span>
              </div>
            }
            <hr />
            <div class="detail-row total-row">
              <span>Total</span>
              <span>\${{ order.grandTotal.toFixed(2) }}</span>
            </div>
          </div>

          <div class="payment-section">
            @if (paymentSuccess) {
              <div class="success-box">
                <div class="success-icon">&#10003;</div>
                <h3>Payment Successful!</h3>
                <p>Your order has been confirmed.</p>
                <a routerLink="/orders" class="btn-primary">View Orders</a>
              </div>
            } @else {
              <h3>Card Details</h3>
              <p class="test-hint">Test card: 4242 4242 4242 4242 | Any future date | Any CVC</p>
              <div #cardElement class="card-element"></div>
              @if (cardError) {
                <p class="card-error">{{ cardError }}</p>
              }
              <button class="btn-pay" (click)="pay()" [disabled]="processing">
                {{ processing ? 'Processing...' : 'Pay $' + order.grandTotal.toFixed(2) }}
              </button>
              @if (errorMsg) {
                <p class="error-msg">{{ errorMsg }}</p>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .checkout-page {
        max-width: 900px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .loading-state {
        text-align: center;
        padding: 3rem;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #d5d5c0;
        border-top-color: #034f46;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1rem;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .checkout-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }
      @media (max-width: 768px) {
        .checkout-layout {
          grid-template-columns: 1fr;
        }
      }

      .order-details {
        background: #ffffeb;
        border: 1px solid #d5d5c0;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      }
      .order-details h3 {
        margin-bottom: 1rem;
        color: #034f46;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.4rem 0;
        color: #1a1a1a;
      }
      .badge {
        background: #034f46;
        color: #ffffeb;
        padding: 0.15rem 0.6rem;
        border-radius: 4px;
        font-size: 0.85rem;
      }
      hr {
        border-color: #d5d5c0;
        margin: 0.75rem 0;
      }
      .line-item {
        display: flex;
        justify-content: space-between;
        padding: 0.4rem 0;
      }
      .item-name {
        color: #1a1a1a;
      }
      .item-price {
        color: #16a34a;
        font-weight: 600;
      }
      .total-row {
        font-size: 1.2rem;
        font-weight: 700;
        color: #16a34a;
      }

      .payment-section {
        background: #ffffeb;
        border: 1px solid #d5d5c0;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      }
      .payment-section h3 {
        margin-bottom: 0.5rem;
        color: #1a1a1a;
      }
      .test-hint {
        color: #999;
        font-size: 0.8rem;
        margin-bottom: 1rem;
        font-style: italic;
      }

      .card-element {
        background: #ffffeb;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 1rem;
        min-height: 44px;
      }

      .card-error {
        color: #dc2626;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
      }

      .btn-pay {
        width: 100%;
        padding: 0.85rem;
        background: linear-gradient(135deg, #034f46, #034f46);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 1.05rem;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .btn-pay:hover:not(:disabled) {
        opacity: 0.9;
      }
      .btn-pay:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .error-msg {
        color: #dc2626;
        margin-top: 0.75rem;
        text-align: center;
      }
      .error-box {
        text-align: center;
        background: #fee2e2;
        color: #dc2626;
        padding: 2rem;
        border-radius: 16px;
      }
      .btn-back {
        display: inline-block;
        margin-top: 1rem;
        color: #1a1a1a;
        background: #e4e4d0;
        border: 1px solid #c8c8b4;
        padding: 0.5rem 1.5rem;
        border-radius: 8px;
        text-decoration: none;
      }

      .success-box {
        text-align: center;
        padding: 2rem 1rem;
      }
      .success-icon {
        font-size: 3rem;
        color: #16a34a;
        margin-bottom: 0.5rem;
      }
      .success-box h3 {
        color: #16a34a;
        margin-bottom: 0.5rem;
      }
      .success-box p {
        color: #666;
        margin-bottom: 1.5rem;
      }
      .btn-primary {
        background: #034f46;
        color: white;
        padding: 0.6rem 1.5rem;
        border-radius: 8px;
        text-decoration: none;
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cardElement') cardElementRef!: ElementRef;

  order: Order | null = null;
  loading = true;
  processing = false;
  paymentSuccess = false;
  errorMsg = '';
  cardError = '';

  private stripe: any;
  private elements: any;
  private card: any;
  private clientSecret = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const orderId = Number(this.route.snapshot.paramMap.get('orderId'));
    if (!orderId) {
      this.errorMsg = 'Invalid order ID';
      this.loading = false;
      return;
    }

    this.orderService.getMyOrder(orderId).subscribe({
      next: (order) => {
        this.order = order;
        if (order.status !== 'PENDING') {
          this.errorMsg = 'This order is not in PENDING status.';
          this.loading = false;
          return;
        }
        this.createIntent(orderId);
      },
      error: () => {
        this.errorMsg = 'Order not found';
        this.loading = false;
      },
    });
  }

  ngAfterViewInit() {}

  private createIntent(orderId: number) {
    this.paymentService.createPaymentIntent({ orderId }).subscribe({
      next: (res) => {
        this.clientSecret = res.clientSecret;
        this.loading = false;
        this.cdr.detectChanges();
        this.initStripe(res.publishableKey);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Failed to initiate payment';
        this.loading = false;
      },
    });
  }

  private initStripe(publishableKey: string) {
    if (typeof Stripe === 'undefined') {
      this.errorMsg = 'Stripe.js failed to load';
      return;
    }

    this.stripe = Stripe(publishableKey);
    this.elements = this.stripe.elements();
    this.card = this.elements.create('card', {
      style: {
        base: {
          color: '#1a1a2e',
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          '::placeholder': { color: '#6b7280' },
        },
        invalid: { color: '#ef4444' },
      },
    });

    this.card.mount(this.cardElementRef.nativeElement);
    this.card.on('change', (event: any) => {
      this.cardError = event.error ? event.error.message : '';
      this.cdr.detectChanges();
    });
  }

  async pay() {
    if (!this.stripe || !this.card || !this.clientSecret) return;

    this.processing = true;
    this.errorMsg = '';

    const { error, paymentIntent } = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.card },
    });

    if (error) {
      this.errorMsg = error.message || 'Payment failed';
      this.processing = false;
      this.cdr.detectChanges();
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      this.paymentService.confirmPayment(paymentIntent.id).subscribe({
        next: () => {
          // Clear cart only after successful payment
          this.cartService.clearCart().subscribe();
          this.paymentSuccess = true;
          this.processing = false;
          this.cdr.detectChanges();
        },
        error: () => {
          // Payment went through on Stripe side, clear cart anyway
          this.cartService.clearCart().subscribe();
          this.paymentSuccess = true;
          this.processing = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  ngOnDestroy() {
    if (this.card) {
      this.card.destroy();
    }
  }
}
