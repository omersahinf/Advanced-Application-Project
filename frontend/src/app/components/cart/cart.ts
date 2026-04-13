import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Cart, CartItem } from '../../models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cart-page">
      <h2>Shopping Cart</h2>

      @if (loading) {
        <p>Loading cart...</p>
      } @else if (!cart || cart.items.length === 0) {
        <div class="empty-cart">
          <p>Your cart is empty.</p>
          <a routerLink="/products" class="btn-primary">Browse Products</a>
        </div>
      } @else {
        <div class="cart-layout">
          <div class="cart-items">
            @for (item of cart.items; track item.id) {
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
              <span>Items ({{ cart.itemCount }})</span>
              <span>\${{ cart.total.toFixed(2) }}</span>
            </div>
            <hr />
            <div class="summary-row total">
              <span>Total</span>
              <span>\${{ cart.total.toFixed(2) }}</span>
            </div>

            <div class="checkout-section">
              <button class="btn-checkout" (click)="checkout()" [disabled]="placing">
                {{ placing ? 'Placing Order...' : 'Proceed to Payment' }}
              </button>
            </div>

            <button class="btn-clear" (click)="clearCart()">Clear Cart</button>
          </div>
        </div>

        @if (orderSuccess) {
          <div class="success-msg">
            Order placed successfully! <a routerLink="/orders">View Orders</a>
          </div>
        }
        @if (errorMsg) {
          <div class="error-msg">{{ errorMsg }}</div>
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
        padding: 3rem;
      }
      .btn-primary {
        background: #7c3aed;
        color: white;
        padding: 0.6rem 1.5rem;
        border-radius: 8px;
        text-decoration: none;
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
        background: #1e1e2e;
        border-radius: 8px;
        margin-bottom: 0.75rem;
      }
      .item-info {
        flex: 1;
      }
      .item-info h4 a {
        color: #c4b5fd;
        text-decoration: none;
      }
      .item-info .store {
        color: #9ca3af;
        font-size: 0.85rem;
      }
      .item-info .sku {
        color: #6b7280;
        font-size: 0.8rem;
      }
      .item-price {
        color: #10b981;
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
        background: #374151;
        color: white;
        border: none;
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
        color: white;
        min-width: 90px;
        text-align: right;
      }
      .btn-remove {
        background: none;
        border: 1px solid #ef4444;
        color: #ef4444;
        padding: 0.3rem 0.8rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .cart-summary {
        background: #1e1e2e;
        border-radius: 12px;
        padding: 1.5rem;
        height: fit-content;
      }
      .cart-summary h3 {
        margin-bottom: 1rem;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
      }
      .summary-row.total {
        font-size: 1.2rem;
        font-weight: 700;
        color: #10b981;
      }
      hr {
        border-color: #374151;
        margin: 0.5rem 0;
      }
      .checkout-section {
        margin-top: 1rem;
      }
      .checkout-section label {
        display: block;
        margin-bottom: 0.5rem;
        color: #9ca3af;
        font-size: 0.9rem;
      }
      .checkout-section select {
        width: 100%;
        padding: 0.5rem;
        border-radius: 6px;
        background: #111827;
        color: white;
        border: 1px solid #374151;
        margin-bottom: 1rem;
      }
      .btn-checkout {
        width: 100%;
        padding: 0.75rem;
        background: #10b981;
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
        border: 1px solid #6b7280;
        color: #9ca3af;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 0.75rem;
      }
      .success-msg {
        background: #065f46;
        color: #6ee7b7;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        text-align: center;
      }
      .success-msg a {
        color: white;
      }
      .error-msg {
        background: #7f1d1d;
        color: #fca5a5;
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
  cart: Cart | null = null;
  loading = true;
  placing = false;
  orderSuccess = false;
  errorMsg = '';

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
        this.cart = c;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  updateQty(item: CartItem, qty: number) {
    this.cartService.updateQuantity(item.productId, qty).subscribe((c) => (this.cart = c));
  }

  remove(productId: number) {
    this.cartService.removeFromCart(productId).subscribe((c) => (this.cart = c));
  }

  clearCart() {
    this.cartService.clearCart().subscribe(() => {
      this.cart = { items: [], total: 0, itemCount: 0 };
    });
  }

  checkout() {
    if (!this.cart || this.cart.items.length === 0) return;
    this.placing = true;
    this.errorMsg = '';

    // Group items by store
    const byStore = new Map<number, { productId: number; quantity: number }[]>();
    for (const item of this.cart.items) {
      if (!byStore.has(item.storeId)) byStore.set(item.storeId, []);
      byStore.get(item.storeId)!.push({ productId: item.productId, quantity: item.quantity });
    }

    // Place order for the first store, then redirect to Stripe checkout
    const [storeId, items] = byStore.entries().next().value!;
    this.orderService.placeOrder({ storeId, paymentMethod: 'STRIPE', items }).subscribe({
      next: (order) => {
        this.cartService.clearCart().subscribe(() => {
          this.router.navigate(['/checkout', order.id]);
        });
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Failed to place order';
        this.placing = false;
      },
    });
  }
}
