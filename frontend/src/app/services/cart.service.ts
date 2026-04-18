import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cart } from '../models/product.model';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly API = '/api/cart';

  /** Reactive cart item count for the header badge */
  cartCount = signal(0);

  constructor(private http: HttpClient) {}

  /** Refresh cart count from server */
  refreshCartCount() {
    this.http.get<Cart>(this.API).subscribe({
      next: (c) => this.cartCount.set(c.itemCount ?? c.items?.length ?? 0),
      error: () => this.cartCount.set(0),
    });
  }

  getCart() {
    return this.http.get<Cart>(this.API).pipe(
      tap((c) => this.cartCount.set(c.itemCount ?? c.items?.length ?? 0))
    );
  }

  addToCart(productId: number, quantity: number) {
    return this.http.post<Cart>(this.API, { productId, quantity }).pipe(
      tap((c) => this.cartCount.set(c.itemCount ?? c.items?.length ?? 0))
    );
  }

  updateQuantity(productId: number, quantity: number) {
    return this.http.patch<Cart>(`${this.API}/${productId}`, { quantity }).pipe(
      tap((c) => this.cartCount.set(c.itemCount ?? c.items?.length ?? 0))
    );
  }

  removeFromCart(productId: number) {
    return this.http.delete<Cart>(`${this.API}/${productId}`).pipe(
      tap((c) => this.cartCount.set(c.itemCount ?? c.items?.length ?? 0))
    );
  }

  clearCart() {
    return this.http.delete<{ message: string }>(this.API).pipe(
      tap(() => this.cartCount.set(0))
    );
  }
}
