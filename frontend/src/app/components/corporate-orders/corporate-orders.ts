import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/product.model';

@Component({
  selector: 'app-corporate-orders',
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Order Management</h1>
      </div>

      <div class="date-filter">
        <label>From: <input type="date" [(ngModel)]="startDate" (change)="filterByDate()"></label>
        <label>To: <input type="date" [(ngModel)]="endDate" (change)="filterByDate()"></label>
        <button class="btn-xs primary" (click)="clearDateFilter()">Clear</button>
      </div>

      <div class="table-card card">
        <table>
          <thead>
            <tr>
              <th>Order #</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o.id) {
              <tr>
                <td><strong>#{{ o.id }}</strong></td>
                <td>{{ o.userName }}</td>
                <td>{{ o.orderDate | date:'short' }}</td>
                <td>{{ o.items.length || 0 }} items</td>
                <td>\${{ o.grandTotal | number:'1.2-2' }}</td>
                <td><span class="status-badge" [class]="'s-' + o.status.toLowerCase()">{{ o.status }}</span></td>
                <td>
                  @if (o.status === 'PENDING') {
                    <button class="btn-xs success" (click)="updateStatus(o.id, 'CONFIRMED')">Confirm</button>
                  }
                  @if (o.status === 'CONFIRMED') {
                    <button class="btn-xs primary" (click)="updateStatus(o.id, 'SHIPPED')">Ship</button>
                  }
                  @if (o.status === 'SHIPPED') {
                    <button class="btn-xs success" (click)="updateStatus(o.id, 'DELIVERED')">Delivered</button>
                  }
                </td>
              </tr>
              @if (o.items && o.items.length > 0) {
                <tr class="detail-row">
                  <td colspan="7">
                    <div class="items-detail">
                      @for (item of o.items; track item.id) {
                        <span class="item-pill">{{ item.productName }} x{{ item.quantity }} (\${{ item.price | number:'1.2-2' }})</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
        @if (orders().length === 0) {
          <div class="empty">No orders yet</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; }
    .table-card { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; }
    td { padding: 12px 16px; border-top: 1px solid #f1f5f9; }
    tr:hover td { background: #f8fafc; }
    .detail-row td { padding: 8px 16px; background: #f8fafc !important; }
    .items-detail { display: flex; flex-wrap: wrap; gap: 6px; }
    .item-pill { font-size: 12px; background: white; padding: 4px 10px; border-radius: 6px; border: 1px solid #e5e7eb; }
    .status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; }
    .s-pending { background: #fef3c7; color: #d97706; }
    .s-confirmed { background: #dbeafe; color: #2563eb; }
    .s-shipped { background: #e0e7ff; color: #4338ca; }
    .s-delivered { background: #dcfce7; color: #16a34a; }
    .s-cancelled { background: #fee2e2; color: #dc2626; }
    .btn-xs { padding: 4px 10px; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600; margin-right: 4px; }
    .btn-xs.success { background: #dcfce7; color: #16a34a; }
    .btn-xs.primary { background: #dbeafe; color: #2563eb; }
    .date-filter { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .date-filter label { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .date-filter input[type="date"] { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; font-family: inherit; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; }
  `]
})
export class CorporateOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  allOrders = signal<Order[]>([]);
  startDate = '';
  endDate = '';

  constructor(private orderService: OrderService) {}

  ngOnInit() { this.load(); }

  load() {
    this.orderService.getStoreOrders().subscribe(o => {
      this.allOrders.set(o);
      this.orders.set(o);
    });
  }

  filterByDate() {
    let filtered = this.allOrders();
    if (this.startDate) {
      const start = new Date(this.startDate);
      filtered = filtered.filter(o => new Date(o.orderDate) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => new Date(o.orderDate) <= end);
    }
    this.orders.set(filtered);
  }

  clearDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.orders.set(this.allOrders());
  }

  updateStatus(orderId: number, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe(() => this.load());
  }
}
