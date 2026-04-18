import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/product.model';

@Component({
  selector: 'app-my-orders',
  imports: [DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>My Orders</h1>
        <button class="btn btn-primary btn-sm" (click)="exportCSV()">Export CSV</button>
        <div class="filter-bar">
          <button class="filter-btn" [class.active]="filter() === ''" (click)="loadOrders('')">
            All
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'PENDING'"
            (click)="loadOrders('PENDING')"
          >
            Pending
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'SHIPPED'"
            (click)="loadOrders('SHIPPED')"
          >
            Shipped
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'DELIVERED'"
            (click)="loadOrders('DELIVERED')"
          >
            Delivered
          </button>
        </div>
      </div>

      @for (o of orders(); track o.id) {
        <div class="order-card card">
          <div class="order-header">
            <div>
              <h3>Order #{{ o.id }}</h3>
              <span class="order-date">{{ o.orderDate | date: 'medium' }}</span>
            </div>
            <div class="order-right">
              <span class="status-badge" [class]="'s-' + o.status.toLowerCase()">{{
                o.status
              }}</span>
              <span class="order-total">\${{ o.grandTotal | number: '1.2-2' }}</span>
            </div>
          </div>

          <div class="order-store">{{ o.storeName }} &middot; {{ o.paymentMethod }}</div>

          <div class="items-list">
            @for (item of o.items; track item.id) {
              <div class="item-row">
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-qty">x{{ item.quantity }}</span>
                <span class="item-price">\${{ item.price | number: '1.2-2' }}</span>
              </div>
            }
          </div>

          @if (o.shipment) {
            <div class="shipment-info">
              <span>📦 {{ o.shipment.carrier }} - {{ o.shipment.trackingNumber }}</span>
              <span>{{ o.shipment.status }} via {{ o.shipment.mode }}</span>
            </div>
          }

          @if (o.status === 'PENDING') {
            <div class="order-actions">
              <a [routerLink]="['/checkout', o.id]" class="btn btn-pay btn-sm">Pay with Stripe</a>
              <button class="btn btn-danger btn-sm" (click)="cancel(o.id)">Cancel Order</button>
            </div>
          }
        </div>
      }

      @if (orders().length === 0) {
        <div class="empty card">No orders found</div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 24px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .filter-bar {
        display: flex;
        gap: 6px;
      }
      .filter-btn {
        padding: 6px 14px;
        border: 1px solid #c8c8b4;
        border-radius: 6px;
        background: #ffffeb;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s;
        color: #666;
      }
      .filter-btn.active {
        background: #034f46;
        color: white;
        border-color: #034f46;
      }
      .filter-btn:hover:not(.active) {
        border-color: #034f46;
        color: #1a1a1a;
      }
      .order-card {
        padding: 20px;
        margin-bottom: 12px;
      }
      .order-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      .order-header h3 {
        font-size: 16px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .order-date {
        font-size: 12px;
        color: #666;
      }
      .order-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .order-total {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
        text-transform: uppercase;
      }
      .s-pending {
        background: #fef3c7;
        color: #d97706;
      }
      .s-confirmed {
        background: #034f46;
        color: #ffffeb;
      }
      .s-shipped {
        background: #e0e7ff;
        color: #4338ca;
      }
      .s-delivered {
        background: #dcfce7;
        color: #16a34a;
      }
      .s-cancelled {
        background: #fee2e2;
        color: #dc2626;
      }
      .order-store {
        font-size: 13px;
        color: #666;
        margin-bottom: 12px;
      }
      .items-list {
        border-top: 1px solid #d5d5c0;
        padding-top: 12px;
      }
      .item-row {
        display: flex;
        align-items: center;
        padding: 6px 0;
        font-size: 13px;
        color: #1a1a1a;
      }
      .item-name {
        flex: 1;
        font-weight: 500;
      }
      .item-qty {
        width: 50px;
        color: #666;
        text-align: center;
      }
      .item-price {
        width: 80px;
        text-align: right;
        font-weight: 600;
      }
      .shipment-info {
        margin-top: 12px;
        padding: 10px 14px;
        background: rgba(3, 79, 70, 0.08);
        border-radius: 8px;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        color: #034f46;
      }
      .order-actions {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #d5d5c0;
        display: flex;
        gap: 8px;
      }
      .btn-pay {
        background: #034f46;
        color: white;
        border-radius: 6px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }
      .btn-sm {
        padding: 8px 16px;
        font-size: 13px;
      }
      .empty {
        padding: 40px;
        text-align: center;
        color: #666;
      }
    `,
  ],
})
export class MyOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  filter = signal('');

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.loadOrders('');
  }

  loadOrders(status: string) {
    this.filter.set(status);
    this.orderService.getMyOrders(status || undefined).subscribe((o) => this.orders.set(o));
  }

  cancel(orderId: number) {
    if (confirm('Cancel this order?')) {
      this.orderService.cancelOrder(orderId).subscribe(() => this.loadOrders(this.filter()));
    }
  }

  exportCSV() {
    const orders = this.orders();
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Date', 'Store', 'Status', 'Payment Method', 'Grand Total'];
    const rows = orders.map((o) =>
      [o.id, o.orderDate, o.storeName, o.status, o.paymentMethod, o.grandTotal].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
