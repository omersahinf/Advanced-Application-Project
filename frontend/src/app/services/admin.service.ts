import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  UserDto,
  AuditLog,
  StoreComparison,
  CustomerSegmentation,
  AdminCreateUserRequest,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AdminService {

  constructor(private http: HttpClient) {}

  getAllUsers() {
    return this.http.get<UserDto[]>('/api/admin/users');
  }

  getUsersByRole(role: string) {
    return this.http.get<UserDto[]>(`/api/admin/users/role/${role}`);
  }

  deleteUser(id: number) {
    return this.http.delete(`/api/admin/users/${id}`);
  }

  createUser(data: AdminCreateUserRequest) {
    return this.http.post<UserDto>('/api/admin/users', data);
  }

  createCorporateUser(data: any) {
    return this.http.post<UserDto>('/api/admin/users/corporate', data);
  }

  // Audit Logs
  getAuditLogs() {
    return this.http.get<AuditLog[]>('/api/admin/audit-logs');
  }

  getAuditLogsByUser(userId: number) {
    return this.http.get<AuditLog[]>(`/api/admin/audit-logs/user/${userId}`);
  }

  // Cross-store Comparison
  getStoreComparison() {
    return this.http.get<StoreComparison[]>('/api/admin/stores/comparison');
  }

  // Customer Segmentation
  getCustomerSegmentation() {
    return this.http.get<CustomerSegmentation>('/api/admin/customers/segmentation');
  }

  // Export
  exportOrders() {
    return this.http.get('/api/admin/export/orders', { responseType: 'blob' });
  }

  exportProducts() {
    return this.http.get('/api/admin/export/products', { responseType: 'blob' });
  }

  exportUsers() {
    return this.http.get('/api/admin/export/users', { responseType: 'blob' });
  }

  suspendUser(id: number, suspended: boolean) {
    return this.http.patch(`/api/admin/users/${id}/suspend`, { suspended });
  }

  // Settings
  getSettings() {
    return this.http.get<any>('/api/admin/settings');
  }

  updateSettings(settings: any) {
    return this.http.put('/api/admin/settings', settings);
  }
}
