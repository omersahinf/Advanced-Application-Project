import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AuditLog, StoreComparison, CustomerSegmentation } from '../../models/product.model';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-page">
      <div class="tabs">
        <button [class.active]="tab === 'comparison'" (click)="tab = 'comparison'">Store Comparison</button>
        <button [class.active]="tab === 'segmentation'" (click)="tab = 'segmentation'">Customer Segmentation</button>
        <button [class.active]="tab === 'audit'" (click)="tab = 'audit'; loadAuditLogs()">Audit Logs</button>
        <button [class.active]="tab === 'export'" (click)="tab = 'export'">Export Data</button>
      </div>

      <!-- Store Comparison -->
      @if (tab === 'comparison') {
        <h2>Cross-Store Comparison</h2>
        @if (stores.length === 0) {
          <p>Loading...</p>
        } @else {
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Store</th><th>Owner</th><th>Status</th><th>Products</th>
                  <th>Orders</th><th>Revenue</th><th>Avg Rating</th><th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                @for (s of stores; track s.storeId) {
                  <tr>
                    <td>{{ s.storeName }}</td>
                    <td>{{ s.ownerName }}</td>
                    <td><span class="badge" [class]="s.status.toLowerCase()">{{ s.status }}</span></td>
                    <td>{{ s.totalProducts }}</td>
                    <td>{{ s.totalOrders }}</td>
                    <td class="revenue">\${{ s.totalRevenue.toFixed(2) }}</td>
                    <td>{{ s.avgRating.toFixed(1) }}</td>
                    <td>{{ s.totalReviews }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Customer Segmentation -->
      @if (tab === 'segmentation') {
        <h2>Customer Segmentation</h2>
        @if (!segmentation) {
          <p>Loading...</p>
        } @else {
          <div class="seg-grid">
            <div class="seg-card">
              <h4>Total Customers</h4>
              <p class="big-num">{{ segmentation.totalCustomers }}</p>
            </div>
            <div class="seg-card">
              <h4>Avg Spend</h4>
              <p class="big-num">\${{ segmentation.avgSpend.toFixed(2) }}</p>
            </div>
          </div>
          <div class="seg-grid">
            <div class="seg-card">
              <h4>By Membership</h4>
              @for (entry of objectEntries(segmentation.byMembership); track entry[0]) {
                <div class="seg-row">
                  <span class="badge membership">{{ entry[0] }}</span>
                  <span>{{ entry[1] }} customers</span>
                  <span class="spend">\${{ (segmentation.spendByMembership[entry[0]] || 0).toFixed(2) }} total spend</span>
                </div>
              }
            </div>
            <div class="seg-card">
              <h4>By City</h4>
              @for (entry of objectEntries(segmentation.byCity); track entry[0]) {
                <div class="seg-row">
                  <span>{{ entry[0] }}</span>
                  <span>{{ entry[1] }} customers</span>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Audit Logs -->
      @if (tab === 'audit') {
        <h2>Audit Logs</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
            </thead>
            <tbody>
              @for (log of auditLogs; track log.id) {
                <tr>
                  <td>{{ log.timestamp | date:'short' }}</td>
                  <td>{{ log.userEmail || 'System' }}</td>
                  <td><span class="badge action">{{ log.action }}</span></td>
                  <td>{{ log.entityType }} #{{ log.entityId }}</td>
                  <td>{{ log.details }}</td>
                </tr>
              }
              @if (auditLogs.length === 0) {
                <tr><td colspan="5" style="text-align:center">No audit logs yet</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Export -->
      @if (tab === 'export') {
        <h2>Export Data</h2>
        <div class="export-grid">
          <div class="export-card" (click)="exportData('orders')">
            <h4>Orders</h4>
            <p>Export all orders as CSV</p>
          </div>
          <div class="export-card" (click)="exportData('products')">
            <h4>Products</h4>
            <p>Export all products as CSV</p>
          </div>
          <div class="export-card" (click)="exportData('users')">
            <h4>Users</h4>
            <p>Export all users as CSV</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .analytics-page { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .tabs button { padding: 0.6rem 1.2rem; border: 1px solid #374151; background: #1e1e2e; color: #9ca3af; border-radius: 8px; cursor: pointer; }
    .tabs button.active { background: #7c3aed; color: white; border-color: #7c3aed; }
    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: #1e1e2e; border-radius: 8px; overflow: hidden; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #374151; }
    th { background: #111827; color: #9ca3af; font-size: 0.85rem; text-transform: uppercase; }
    .revenue { color: #10b981; font-weight: 600; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .badge.active { background: #065f46; color: #6ee7b7; }
    .badge.closed { background: #7f1d1d; color: #fca5a5; }
    .badge.action { background: #1e3a5f; color: #93c5fd; }
    .badge.membership { background: #4c1d95; color: #c4b5fd; }
    .seg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .seg-card { background: #1e1e2e; border-radius: 12px; padding: 1.5rem; }
    .seg-card h4 { color: #9ca3af; margin-bottom: 0.75rem; }
    .big-num { font-size: 2rem; font-weight: 700; color: #10b981; }
    .seg-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #374151; gap: 0.5rem; }
    .spend { color: #10b981; font-size: 0.85rem; }
    .export-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
    .export-card { background: #1e1e2e; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: transform 0.2s; border: 1px solid #374151; }
    .export-card:hover { transform: translateY(-2px); border-color: #7c3aed; }
    .export-card h4 { color: #c4b5fd; margin-bottom: 0.5rem; }
    .export-card p { color: #9ca3af; font-size: 0.9rem; }
  `]
})
export class AdminAnalyticsComponent implements OnInit {
  tab = 'comparison';
  stores: StoreComparison[] = [];
  segmentation: CustomerSegmentation | null = null;
  auditLogs: AuditLog[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getStoreComparison().subscribe(s => this.stores = s);
    this.adminService.getCustomerSegmentation().subscribe(s => this.segmentation = s);
  }

  loadAuditLogs() {
    if (this.auditLogs.length === 0) {
      this.adminService.getAuditLogs().subscribe(l => this.auditLogs = l);
    }
  }

  exportData(type: 'orders' | 'products' | 'users') {
    const exportFn = type === 'orders' ? this.adminService.exportOrders()
                   : type === 'products' ? this.adminService.exportProducts()
                   : this.adminService.exportUsers();

    exportFn.subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  objectEntries(obj: Record<string, number>): [string, number][] {
    return Object.entries(obj || {});
  }
}
