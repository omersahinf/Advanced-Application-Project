import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly API = '/api/products';

  constructor(private http: HttpClient) {}

  getProducts(search?: string) {
    const params: any = {};
    if (search) params.search = search;
    return this.http.get<Product[]>(this.API, { params });
  }

  getProduct(id: number) {
    return this.http.get<Product>(`${this.API}/${id}`);
  }

  getProductsByCategory(categoryId: number) {
    return this.http.get<Product[]>(this.API, { params: { categoryId: categoryId.toString() } });
  }

  getProductsByStore(storeId: number) {
    return this.http.get<Product[]>(this.API, { params: { storeId: storeId.toString() } });
  }
}
