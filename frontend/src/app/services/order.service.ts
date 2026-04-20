import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order, CreateOrderRequest } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  getMyOrders(status?: string) {
    if (status) {
      return this.http.get<Order[]>('/api/orders/my', { params: { status } });
    }
    return this.http.get<Order[]>('/api/orders/my');
  }

  getMyOrder(id: number) {
    return this.http.get<Order>(`/api/orders/my/${id}`);
  }

  placeOrder(req: CreateOrderRequest) {
    return this.http.post<Order>('/api/orders', req);
  }

  cancelOrder(orderId: number) {
    return this.http.patch<Order>(`/api/orders/my/${orderId}/cancel`, {});
  }

  returnOrder(orderId: number) {
    return this.http.patch<Order>(`/api/orders/my/${orderId}/return`, {});
  }

  // Corporate
  getStoreOrders() {
    return this.http.get<Order[]>('/api/store/my/orders');
  }

  updateOrderStatus(orderId: number, status: string) {
    return this.http.patch<Order>(`/api/store/my/orders/${orderId}/status`, { status });
  }

  // Admin
  getAllOrders(status?: string) {
    if (status) {
      return this.http.get<Order[]>('/api/orders', { params: { status } });
    }
    return this.http.get<Order[]>('/api/orders');
  }
}
