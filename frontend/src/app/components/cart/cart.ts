import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Cart, CartItem } from '../../models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="loading">Loading cart…</div>
      } @else if (!cart() || cart()!.items.length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">🛍️</div>
          <div class="empty-title">Your cart is empty</div>
          <p>Add items from the catalog to get started.</p>
          <a routerLink="/products" class="btn btn-primary" style="margin-top: 12px">
            Browse products
          </a>
        </div>
      } @else {
        <div class="cart-layout">
          <div class="cart-items">
            @for (item of cart()!.items; track item.id) {
              <div class="cart-item">
                <div class="item-info">
                  <h4>
                    <a [routerLink]="['/products', item.productId]">{{ item.productName }}</a>
                  </h4>
                  <p class="store">{{ item.storeName }}</p>
                  <p class="sku">SKU {{ item.productSku }}</p>
                </div>
                <div class="item-price">\${{ item.unitPrice.toFixed(2) }}</div>
                <div class="item-quantity" role="group" aria-label="Quantity">
                  <button
                    type="button"
                    (click)="updateQty(item, item.quantity - 1)"
                    [disabled]="item.quantity <= 1"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{{ item.quantity }}</span>
                  <button
                    type="button"
                    (click)="updateQty(item, item.quantity + 1)"
                    [disabled]="item.quantity >= item.stock"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div class="item-subtotal">\${{ item.subtotal.toFixed(2) }}</div>
                <button class="btn-remove" type="button" (click)="remove(item.productId)">
                  Remove
                </button>
              </div>
            }
          </div>

          <div class="cart-summary">
            <h3>Order summary</h3>
            <div class="summary-row">
              <span>Items ({{ cart()!.itemCount }})</span>
              <span>\${{ cart()!.total.toFixed(2) }}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span>\${{ cart()!.total.toFixed(2) }}</span>
            </div>

            <div class="payment-method-section">
              <h4>Payment method</h4>
              <label class="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="STRIPE"
                  [(ngModel)]="paymentMethod"
                />
                <span>💳 Credit / Debit card</span>
              </label>
              <label class="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  [(ngModel)]="paymentMethod"
                />
                <span>💵 Cash on delivery</span>
              </label>
            </div>

            <div class="checkout-section">
              <button
                class="btn-checkout"
                type="button"
                (click)="checkout()"
                [disabled]="placing()"
              >
                {{
                  placing()
                    ? 'Placing order…'
                    : paymentMethod === 'COD'
                      ? 'Place order (Pay on delivery)'
                      : 'Proceed to payment'
                }}
              </button>
            </div>

            <button class="btn-clear" type="button" (click)="clearCart()">Clear cart</button>
          </div>
        </div>

        @if (orderSuccess()) {
          <div class="success-msg">
            Order placed successfully! <a routerLink="/orders">View orders</a>
          </div>
        }
        @if (errorMsg()) {
          <div class="error-msg">{{ errorMsg() }}</div>
        }
      }
    </div>
  `,
  styleUrls: ['./cart.scss'],
})
export class CartComponent implements OnInit {
  cart = signal<Cart | null>(null);
  loading = signal(true);
  placing = signal(false);
  orderSuccess = signal(false);
  errorMsg = signal('');
  paymentMethod: 'STRIPE' | 'COD' = 'STRIPE';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadCart();
  }

  loadCart() {
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

    // Group items by store (existing server contract: one order per store).
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
