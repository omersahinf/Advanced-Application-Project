import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cart } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly API = '/api/cart';

  constructor(private http: HttpClient) {}

  getCart() {
    return this.http.get<Cart>(this.API);
  }

  addToCart(productId: number, quantity: number) {
    return this.http.post<Cart>(this.API, { productId, quantity });
  }

  updateQuantity(productId: number, quantity: number) {
    return this.http.patch<Cart>(`${this.API}/${productId}`, { quantity });
  }

  removeFromCart(productId: number) {
    return this.http.delete<Cart>(`${this.API}/${productId}`);
  }

  clearCart() {
    return this.http.delete<{ message: string }>(this.API);
  }
}
