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
    <div class="page">
      @if (loading) {
        <div class="loading-state">
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading order details…</p>
        </div>
      } @else if (errorMsg && !order) {
        <div class="error-box">
          <p>{{ errorMsg }}</p>
          <a routerLink="/orders" class="btn-back">Back to orders</a>
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
              <span class="status-pill" [class]="'status-' + order.status">{{ order.status }}</span>
            </div>
            <hr />
            @for (item of order.items; track item.id) {
              <div class="line-item">
                <span class="item-name">{{ item.productName }} × {{ item.quantity }}</span>
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
                <div class="success-icon" aria-hidden="true">✓</div>
                <h3>Payment successful</h3>
                <p>Your order has been confirmed.</p>
                <a routerLink="/orders" class="btn btn-primary">View orders</a>
              </div>
            } @else {
              <h3>Card details</h3>
              <p class="test-hint">
                Test card: 4242 4242 4242 4242 · any future date · any CVC
              </p>
              <div #cardElement class="card-element"></div>
              @if (cardError) {
                <p class="card-error">{{ cardError }}</p>
              }
              <button class="btn-pay" type="button" (click)="pay()" [disabled]="processing">
                {{ processing ? 'Processing…' : 'Pay $' + order.grandTotal.toFixed(2) }}
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
  styleUrls: ['./checkout.scss'],
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
          color: '#1a1a1a',
          fontFamily: 'Inter, sans-serif',
          fontSize: '15px',
          '::placeholder': { color: '#8a8a7c' },
        },
        invalid: { color: '#dc2626' },
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
          this.cartService.clearCart().subscribe();
          this.paymentSuccess = true;
          this.processing = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cartService.clearCart().subscribe();
          this.paymentSuccess = true;
          this.processing = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  ngOnDestroy() {
    if (this.card) this.card.destroy();
  }
}
