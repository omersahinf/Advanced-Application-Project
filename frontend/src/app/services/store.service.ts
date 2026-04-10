import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store, Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class StoreService {

  constructor(private http: HttpClient) {}

  // Corporate
  getMyStores() {
    return this.http.get<Store[]>('/api/store/my');
  }

  createStore(data: { name: string; description: string }) {
    return this.http.post<Store>('/api/store/my', data);
  }

  getMyProducts(search?: string) {
    if (search) {
      return this.http.get<Product[]>('/api/store/my/products', { params: { search } });
    }
    return this.http.get<Product[]>('/api/store/my/products');
  }

  createProduct(data: any) {
    return this.http.post<Product>('/api/store/my/products', data);
  }

  updateProduct(id: number, data: any) {
    return this.http.put<Product>(`/api/store/my/products/${id}`, data);
  }

  deleteProduct(id: number) {
    return this.http.delete(`/api/store/my/products/${id}`);
  }

  // Admin
  getAllStores() {
    return this.http.get<Store[]>('/api/admin/stores');
  }

  updateStoreStatus(storeId: number, status: string) {
    return this.http.patch<Store>(`/api/admin/stores/${storeId}/status`, { status });
  }
}
