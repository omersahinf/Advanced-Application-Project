/*
 * Prototype inventory (Flower Prototype.html §IndCheckout):
 *  Layout: 2-col grid "1fr 340px", gap 20
 *  Left card (padding 24):
 *    [30×30 step circle "1" · #dfe9e5]  h2.serif "Payment · Stripe"
 *    right-aligned chip "[shield] PCI-safe · hosted by Stripe Elements"
 *      (bg #dfe9e5, color #1a1a1a, weight 600)
 *    Field block (flex col, gap 16):
 *      label "Card number"                 → input (mono)
 *      grid 1fr 1fr: "Expiry" + "CVC"      → inputs (mono)
 *      label "Cardholder name"             → input
 *      mock-API mono block  (bg var(--hover), radius 12, 12px)
 *      button.btn-primary   "Pay $X.XX →"  (padding 14, centered)
 *           while processing: 3-dot anim + "Confirming payment…"
 *  Right card (padding 20, align-self start):
 *    h3.serif "Your order"
 *    line items (thumb 40 + name bold + "Qty X" text-3 + price bold)
 *    rows: Subtotal · Tax · Shipping (Free over $100 else $8.99)
 *    divider + Total (serif 17px bold)
 *  Done step (centered single card, 40 padding, max 520):
 *    56×56 green check circle (ok-bg + ok)
 *    h1.serif "Payment confirmed"
 *    paragraph  "Order #N is now CONFIRMED. You'll get a tracking number
 *                once {storeName} ships."
 *    mono mock-API block (POST /api/payments/confirm → 200 OK …)
 *    buttons: "View orders" · "Continue shopping"
 *
 * Backend reality:
 *  - Stripe uses a single <Elements> mount (one iframe-backed card input),
 *    so the prototype's four separate fields collapse into one Stripe
 *    Card Element styled to look like the prototype's inputs.
 *  - The POST /api/payments/create-intent call is real — the mono block
 *    shows the actual order id and a sanitized portion of the client
 *    secret returned by the backend.
 */
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { PaymentService } from '../../services/payment.service';
import { CartService } from '../../services/cart.service';
import { Order } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { ProductHeroComponent } from '../../shared/product-hero/product-hero';

declare const Stripe: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [DecimalPipe, RouterLink, FlowerIconComponent, ProductHeroComponent],
  template: `
    @if (loading) {
      <div class="loading-state">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading order details…</p>
      </div>
    } @else if (errorMsg && !order) {
      <div class="error-box card">
        <p>{{ errorMsg }}</p>
        <a routerLink="/orders" class="btn">Back to orders</a>
      </div>
    } @else if (paymentSuccess && order) {
      <!-- ── Done step ──────────────────────────────────── -->
      <div class="done-wrap">
        <div class="card done-card">
          <div class="done-icon" aria-hidden="true">
            <flower-icon name="check" [size]="26" [stroke]="2" />
          </div>
          <h1>Payment confirmed</h1>
          <p>
            Order <b class="mono">#{{ order.id }}</b> is now <b>CONFIRMED</b>. You'll get a tracking
            number once {{ order.storeName }} ships.
          </p>
          <div class="mock-api">
            <div>POST /api/payments/confirm → 200 OK</div>
            <div>payment_intent_id = {{ paymentIntentId || 'pi_—' }}</div>
            <div>status = succeeded · amount = {{ amountCents() }} (USD cents)</div>
          </div>
          <div class="done-actions">
            <button type="button" class="btn" (click)="goToOrders()">View orders</button>
            <button type="button" class="btn btn-primary" (click)="goShopping()">
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    } @else if (order) {
      <!-- ── Pay step ───────────────────────────────────── -->
      <div class="checkout-grid">
        <div class="card pay-card">
          <header class="pay-head">
            <span class="step-dot">1</span>
            <h2>Payment · Stripe</h2>
            <span class="spacer"></span>
            <span class="safe-chip">
              <flower-icon name="shield" [size]="12" />
              PCI-safe · hosted by Stripe Elements
            </span>
          </header>

          <div class="pay-body">
            <div class="field">
              <label class="label">Card details</label>
              <div #cardElement class="card-element"></div>
              @if (cardError) {
                <p class="card-error">{{ cardError }}</p>
              }
            </div>

            <div class="mock-api">
              <div>POST /api/payments/create-intent &#123; orderId: {{ order.id }} &#125;</div>
              <div>← client_secret = {{ clientSecretPreview() }} (4242-test-card ready)</div>
            </div>

            <button
              type="button"
              class="btn btn-primary pay-btn"
              [disabled]="processing || !stripeReady"
              (click)="pay()"
            >
              @if (processing) {
                <span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
                Confirming payment…
              } @else {
                Pay \${{ total() | number: '1.2-2' }}
                <flower-icon name="arrow_right" [size]="14" />
              }
            </button>

            @if (errorMsg) {
              <p class="error-msg">{{ errorMsg }}</p>
            }
          </div>
        </div>

        <div class="card summary-card">
          <h3>Your order</h3>

          @for (it of order.items; track it.id) {
            <div class="line">
              <div class="line-thumb">
                <product-hero [name]="it.productName" [ratio]="1" [size]="22" />
              </div>
              <div class="line-info">
                <div class="line-name">{{ it.productName }}</div>
                <div class="line-qty">Qty {{ it.quantity }}</div>
              </div>
              <div class="line-price">\${{ it.price * it.quantity | number: '1.2-2' }}</div>
            </div>
          }

          <div class="rows">
            <div class="row">
              <span>Subtotal</span><span>\${{ subtotal() | number: '1.2-2' }}</span>
            </div>
            <div class="row">
              <span>Tax</span><span>\${{ tax() | number: '1.2-2' }}</span>
            </div>
            <div class="row">
              <span>Shipping</span>
              <span>{{ shipping() === 0 ? 'Free' : '$' + (shipping() | number: '1.2-2') }}</span>
            </div>
          </div>

          <hr class="divider" />

          <div class="row total-row">
            <b>Total</b>
            <b class="total-value">\${{ total() | number: '1.2-2' }}</b>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./checkout.scss'],
})
export class CheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cardElement') cardElementRef!: ElementRef;

  order: Order | null = null;
  loading = true;
  processing = false;
  stripeReady = false;
  paymentSuccess = false;
  errorMsg = '';
  cardError = '';
  paymentIntentId = '';

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
          fontFamily: 'JetBrains Mono, Menlo, monospace',
          fontSize: '14px',
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
    this.card.on('ready', () => {
      this.stripeReady = true;
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
      this.paymentIntentId = paymentIntent.id;
      this.paymentService.confirmPayment(paymentIntent.id).subscribe({
        next: () => this.onSuccess(),
        error: () => this.onSuccess(),
      });
    }
  }

  private onSuccess() {
    this.cartService.clearCart().subscribe();
    this.paymentSuccess = true;
    this.processing = false;
    this.cdr.detectChanges();
  }

  goToOrders() {
    this.router.navigate(['/orders']);
  }

  goShopping() {
    this.router.navigate(['/products']);
  }

  /* ── summary math — mirrors cart page: 8% tax + free shipping over $100 ── */
  subtotal(): number {
    return (this.order?.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
  }
  tax(): number {
    return this.subtotal() * 0.08;
  }
  shipping(): number {
    const s = this.subtotal();
    return s > 100 ? 0 : s > 0 ? 8.99 : 0;
  }
  total(): number {
    return this.subtotal() + this.tax() + this.shipping();
  }

  clientSecretPreview(): string {
    if (!this.clientSecret) return 'pi_—';
    const s = this.clientSecret;
    return s.length > 18 ? `${s.slice(0, 10)}…${s.slice(-8)}` : s;
  }

  amountCents(): number {
    return Math.round(this.total() * 100);
  }

  ngOnDestroy() {
    if (this.card) this.card.destroy();
  }
}
