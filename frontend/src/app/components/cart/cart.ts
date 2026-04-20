import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Cart, CartItem } from '../../models/product.model';

import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { productEmoji } from '../../shared/product-emoji';

/**
 * Individual — Cart page. Replicates `Flower Prototype.html` §IndCart:
 * left = card with one row per line item; right = sticky 340px order-summary
 * card. Empty state uses the prototype EmptyState copy verbatim.
 *
 * Deviations forced by backend contract:
 *  - The cart DTO doesn't carry product descriptions, so the middle column
 *    drops the description line from the prototype (visual parity preserved
 *    by the store-name subtitle already shown).
 *  - Payment method is required by POST /api/orders, so it stays in the
 *    summary sidebar — the prototype assumes Stripe-only and never asks.
 *    Placed as a small segmented control above the checkout button so it
 *    doesn't distort the summary layout.
 *  - Tax (8%) and shipping ($8.99 free over $100) are computed client-side
 *    to match the prototype totals; the backend only returns the items'
 *    subtotal.
 */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe, FlowerIconComponent],
  template: `
    <div class="page cart-page" [class.cart-empty]="isEmpty()">
      @if (loading()) {
        <div class="loading">Loading cart…</div>
      } @else if (isEmpty()) {
        <div class="card empty-card">
          <div class="empty-icon" aria-hidden="true">
            <flower-icon name="cart" [size]="22" />
          </div>
          <div class="empty-title">Your cart is empty</div>
          <p class="empty-sub">Browse Flower's stores to find something you love.</p>
          <a routerLink="/products" class="btn btn-primary browse-btn">
            Browse products <flower-icon name="arrow_right" [size]="13" />
          </a>
        </div>
      } @else {
        <div class="cart-layout">
          <!-- Line items -->
          <div class="card items-card">
            <div class="items-head">
              <h2>
                Cart · {{ cart()!.itemCount }} {{ cart()!.itemCount === 1 ? 'item' : 'items' }}
              </h2>
            </div>
            @for (item of cart()!.items; track item.id) {
              <div class="cart-row">
                <div class="thumb" [style.background]="thumbGradient(item.productId)">
                  <span class="thumb-emoji">{{ getEmoji(item.productName) }}</span>
                </div>
                <div class="item-body">
                  <div class="sku">{{ item.productSku }}</div>
                  <a class="name" [routerLink]="['/products', item.productId]">{{
                    item.productName
                  }}</a>
                  <div class="store">{{ item.storeName }}</div>
                  <div class="controls">
                    <div class="qty-pill">
                      <button
                        type="button"
                        class="qty-btn"
                        (click)="updateQty(item, item.quantity - 1)"
                        [disabled]="item.quantity <= 1"
                        aria-label="Decrease quantity"
                      >
                        <flower-icon name="minus" [size]="12" />
                      </button>
                      <span class="qty-value">{{ item.quantity }}</span>
                      <button
                        type="button"
                        class="qty-btn"
                        (click)="updateQty(item, item.quantity + 1)"
                        [disabled]="item.quantity >= item.stock"
                        aria-label="Increase quantity"
                      >
                        <flower-icon name="plus" [size]="12" />
                      </button>
                    </div>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm remove-btn"
                      (click)="remove(item.productId)"
                    >
                      <flower-icon name="trash" [size]="13" />
                      Remove
                    </button>
                  </div>
                </div>
                <div class="line-total">
                  <div class="total-value">\${{ item.subtotal | number: '1.2-2' }}</div>
                  <div class="each">\${{ item.unitPrice | number: '1.2-2' }} each</div>
                </div>
              </div>
            }
          </div>

          <!-- Order summary -->
          <aside class="card summary-card">
            <h3>Order summary</h3>
            <div class="row">
              <span>Subtotal</span><span>\${{ subtotal() | number: '1.2-2' }}</span>
            </div>
            <div class="row">
              <span>Tax (8%)</span><span>\${{ tax() | number: '1.2-2' }}</span>
            </div>
            <div class="row">
              <span>Shipping</span>
              <span>{{ shipping() === 0 ? 'Free' : '$' + (shipping() | number: '1.2-2') }}</span>
            </div>
            <hr class="divider" />
            <div class="row total-row">
              <strong>Total</strong>
              <strong class="grand-total">\${{ total() | number: '1.2-2' }}</strong>
            </div>

            <div class="payment-seg" role="radiogroup" aria-label="Payment method">
              <label [class.active]="paymentMethod === 'STRIPE'">
                <input type="radio" name="pay" value="STRIPE" [(ngModel)]="paymentMethod" />
                Card
              </label>
              <label [class.active]="paymentMethod === 'COD'">
                <input type="radio" name="pay" value="COD" [(ngModel)]="paymentMethod" />
                Cash on delivery
              </label>
            </div>

            <button
              type="button"
              class="btn btn-primary checkout-btn"
              (click)="checkout()"
              [disabled]="placing()"
            >
              @if (placing()) {
                Placing order…
              } @else {
                Proceed to checkout <flower-icon name="arrow_right" [size]="14" />
              }
            </button>

            <div class="security-note">
              <flower-icon name="shield" [size]="14" />
              <div>
                Payments secured by Stripe. Test card
                <b class="mono">4242 4242 4242 4242</b>.
              </div>
            </div>

            <button type="button" class="btn btn-ghost btn-sm clear-btn" (click)="clearCart()">
              Clear cart
            </button>

            @if (errorMsg()) {
              <div class="err">{{ errorMsg() }}</div>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styleUrls: ['./cart.scss'],
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  cart = signal<Cart | null>(null);
  loading = signal(true);
  placing = signal(false);
  errorMsg = signal('');
  paymentMethod: 'STRIPE' | 'COD' = 'STRIPE';

  readonly isEmpty = computed(() => {
    const c = this.cart();
    return !c || c.items.length === 0;
  });

  readonly subtotal = computed(() => this.cart()?.total ?? 0);
  readonly tax = computed(() => this.subtotal() * 0.08);
  readonly shipping = computed(() => (this.subtotal() > 100 ? 0 : this.subtotal() > 0 ? 8.99 : 0));
  readonly total = computed(() => this.subtotal() + this.tax() + this.shipping());

  private static readonly PALETTES: [string, string][] = [
    ['#c9ded7', '#dfe9e5'],
    ['#c8e6c9', '#dcfce7'],
    ['#ffe0b2', '#fef3c7'],
    ['#b2dfdb', '#e0f2f1'],
    ['#f8bbd0', '#fce4ec'],
    ['#c5cae9', '#e8eaf6'],
    ['#d7ccc8', '#efebe9'],
    ['#b3e5fc', '#e1f5fe'],
  ];

  thumbGradient(id: number): string {
    const [a, b] = CartComponent.PALETTES[id % CartComponent.PALETTES.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }

  getEmoji(name: string): string {
    return productEmoji(name);
  }

  ngOnInit() {
    this.loadCart();
  }

  private loadCart() {
    this.cartService.getCart().subscribe({
      next: (c) => {
        this.cart.set(c);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.error || err.error?.message || 'Failed to load cart');
      },
    });
  }

  updateQty(item: CartItem, qty: number) {
    if (qty < 1 || qty > item.stock) return;
    this.cartService.updateQuantity(item.productId, qty).subscribe((c) => this.cart.set(c));
  }

  remove(productId: number) {
    this.cartService.removeFromCart(productId).subscribe((c) => this.cart.set(c));
  }

  clearCart() {
    this.cartService.clearCart().subscribe(() => {
      this.cart.set({ items: [], total: 0, itemCount: 0 });
    });
  }

  checkout() {
    const c = this.cart();
    if (!c || c.items.length === 0) return;
    this.placing.set(true);
    this.errorMsg.set('');

    // Existing backend contract: one order per store. We process the first
    // store's items here (same behavior as before — no API change).
    const byStore = new Map<number, { productId: number; quantity: number }[]>();
    for (const item of c.items) {
      if (!byStore.has(item.storeId)) byStore.set(item.storeId, []);
      byStore.get(item.storeId)!.push({ productId: item.productId, quantity: item.quantity });
    }
    const [storeId, items] = byStore.entries().next().value!;
    const isCod = this.paymentMethod === 'COD';

    this.orderService.placeOrder({ storeId, paymentMethod: this.paymentMethod, items }).subscribe({
      next: (order) => {
        if (isCod) {
          this.cartService.clearCart().subscribe(() => {
            this.cart.set({ items: [], total: 0, itemCount: 0 });
            this.placing.set(false);
            this.router.navigate(['/orders']);
          });
        } else {
          this.router.navigate(['/checkout', order.id]);
        }
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Failed to place order');
        this.placing.set(false);
      },
    });
  }
}
