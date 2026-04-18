import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AdminDashboard,
  CorporateDashboard,
  CustomerSegmentation,
  IndividualDashboard,
  RevenueDrillDown,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  getAdminDashboard() {
    return this.http.get<AdminDashboard>('/api/dashboard/admin');
  }

  getCorporateDashboard(startDate?: string, endDate?: string) {
    let params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<CorporateDashboard>('/api/dashboard/corporate', { params });
  }

  getCorporateCustomerSegmentation() {
    return this.http.get<CustomerSegmentation>('/api/dashboard/corporate/customers');
  }

  getCorporateRevenueDrillDown(month: string) {
    return this.http.get<RevenueDrillDown>('/api/dashboard/corporate/revenue-drilldown', {
      params: { month },
    });
  }

  getIndividualDashboard() {
    return this.http.get<IndividualDashboard>('/api/dashboard/individual');
  }
}
