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
    <div class="cart-page">
      <h2>Shopping Cart</h2>

      @if (loading()) {
        <p>Loading cart...</p>
      } @else if (!cart() || cart()!.items.length === 0) {
        <div class="empty-cart">
          <p>Your cart is empty.</p>
          <a routerLink="/products" class="btn-primary">Browse Products</a>
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
                  <p class="sku">SKU: {{ item.productSku }}</p>
                </div>
                <div class="item-price">\${{ item.unitPrice.toFixed(2) }}</div>
                <div class="item-quantity">
                  <button
                    (click)="updateQty(item, item.quantity - 1)"
                    [disabled]="item.quantity <= 1"
                  >
                    -
                  </button>
                  <span>{{ item.quantity }}</span>
                  <button
                    (click)="updateQty(item, item.quantity + 1)"
                    [disabled]="item.quantity >= item.stock"
                  >
                    +
                  </button>
                </div>
                <div class="item-subtotal">\${{ item.subtotal.toFixed(2) }}</div>
                <button class="btn-remove" (click)="remove(item.productId)">Remove</button>
              </div>
            }
          </div>

          <div class="cart-summary">
            <h3>Order Summary</h3>
            <div class="summary-row">
              <span>Items ({{ cart()!.itemCount }})</span>
              <span>\${{ cart()!.total.toFixed(2) }}</span>
            </div>
            <hr />
            <div class="summary-row total">
              <span>Total</span>
              <span>\${{ cart()!.total.toFixed(2) }}</span>
            </div>

            <div class="payment-method-section">
              <h4>Payment Method</h4>
              <label class="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="STRIPE"
                  [(ngModel)]="paymentMethod"
                />
                <span>💳 Credit / Debit Card</span>
              </label>
              <label class="payment-option">
                <input type="radio" name="paymentMethod" value="COD" [(ngModel)]="paymentMethod" />
                <span>💵 Cash on Delivery</span>
              </label>
            </div>

            <div class="checkout-section">
              <button class="btn-checkout" (click)="checkout()" [disabled]="placing()">
                {{
                  placing()
                    ? 'Placing Order...'
                    : paymentMethod === 'COD'
                      ? 'Place Order (Pay on Delivery)'
                      : 'Proceed to Payment'
                }}
              </button>
            </div>

            <button class="btn-clear" (click)="clearCart()">Clear Cart</button>
          </div>
        </div>

        @if (orderSuccess()) {
          <div class="success-msg">
            Order placed successfully! <a routerLink="/orders">View Orders</a>
          </div>
        }
        @if (errorMsg()) {
          <div class="error-msg">{{ errorMsg() }}</div>
        }
      }
    </div>
  `,
  styles: [
    `
      .cart-page {
        max-width: 1000px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .empty-cart {
        text-align: center;
        padding: 4rem 2rem;
      }
      .empty-cart p {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 1.5rem;
      }
      .btn-primary {
        display: inline-block;
        background: #034f46;
        color: white;
        padding: 0.7rem 1.8rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
      }
      .cart-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 2rem;
      }
      .cart-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #ffffeb;
        border: 1px solid #d5d5c0;
        border-radius: 12px;
        margin-bottom: 0.75rem;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      }
      .item-info {
        flex: 1;
      }
      .item-info h4 a {
        color: #034f46;
        text-decoration: none;
      }
      .item-info .store {
        color: #666;
        font-size: 0.85rem;
      }
      .item-info .sku {
        color: #999;
        font-size: 0.8rem;
      }
      .item-price {
        color: #16a34a;
        font-weight: 600;
        min-width: 80px;
        text-align: right;
      }
      .item-quantity {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .item-quantity button {
        background: #e4e4d0;
        color: #1a1a1a;
        border: 1px solid #c8c8b4;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
      }
      .item-quantity button:disabled {
        opacity: 0.4;
      }
      .item-subtotal {
        font-weight: 700;
        color: #1a1a1a;
        min-width: 90px;
        text-align: right;
      }
      .btn-remove {
        background: none;
        border: 1px solid #dc2626;
        color: #dc2626;
        padding: 0.3rem 0.8rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .cart-summary {
        background: #ffffeb;
        border: 1px solid #d5d5c0;
        border-radius: 16px;
        padding: 1.5rem;
        height: fit-content;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      }
      .cart-summary h3 {
        margin-bottom: 1rem;
        color: #1a1a1a;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        color: #1a1a1a;
      }
      .summary-row.total {
        font-size: 1.2rem;
        font-weight: 700;
        color: #16a34a;
      }
      hr {
        border-color: #d5d5c0;
        margin: 0.5rem 0;
      }
      .checkout-section {
        margin-top: 1rem;
      }
      .checkout-section label {
        display: block;
        margin-bottom: 0.5rem;
        color: #666;
        font-size: 0.9rem;
      }
      .checkout-section select {
        width: 100%;
        padding: 0.5rem;
        border-radius: 6px;
        background: #ffffeb;
        color: #1a1a1a;
        border: 1px solid #c8c8b4;
        margin-bottom: 1rem;
      }
      .btn-checkout {
        width: 100%;
        padding: 0.75rem;
        background: #16a34a;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
      }
      .btn-checkout:disabled {
        opacity: 0.5;
      }
      .btn-clear {
        width: 100%;
        padding: 0.5rem;
        background: none;
        border: 1px solid #c8c8b4;
        color: #666;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 0.75rem;
      }
      .payment-method-section {
        margin: 1rem 0;
        padding: 0.75rem 0;
        border-top: 1px solid #d5d5c0;
        border-bottom: 1px solid #d5d5c0;
      }
      .payment-method-section h4 {
        margin: 0 0 0.6rem 0;
        font-size: 0.95rem;
        color: #1a1a1a;
      }
      .payment-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0;
        cursor: pointer;
        font-size: 0.95rem;
        color: #1a1a1a;
      }
      .payment-option input[type='radio'] {
        accent-color: #034f46;
        cursor: pointer;
      }
      .success-msg {
        background: #dcfce7;
        color: #16a34a;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        text-align: center;
      }
      .success-msg a {
        color: #16a34a;
        font-weight: 700;
      }
      .error-msg {
        background: #fee2e2;
        color: #dc2626;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        text-align: center;
      }
      @media (max-width: 768px) {
        .cart-layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
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

    // Group items by store
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
          // COD: order is auto-confirmed server-side; clear cart and go to orders
          this.cartService.clearCart().subscribe(() => {
            this.cart.set({ items: [], total: 0, itemCount: 0 });
            this.placing.set(false);
            this.router.navigate(['/orders']);
          });
        } else {
          // Stripe: redirect to checkout. Cart is cleared after successful payment.
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
