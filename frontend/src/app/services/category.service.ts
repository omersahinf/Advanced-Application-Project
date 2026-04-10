import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Category[]>('/api/categories');
  }

  getTree() {
    return this.http.get<Category[]>('/api/categories/tree');
  }

  create(data: { name: string; parentId?: number }) {
    return this.http.post<Category>('/api/admin/categories', data);
  }

  update(id: number, data: { name: string; parentId?: number }) {
    return this.http.put<Category>(`/api/admin/categories/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete(`/api/admin/categories/${id}`);
  }
}
