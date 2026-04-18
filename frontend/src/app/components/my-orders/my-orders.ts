import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/product.model';

type StepState = 'done' | 'current' | 'todo';
const FLOW = ['PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
const FLOW_LABELS: Record<(typeof FLOW)[number], string> = {
  PENDING: 'Ordered',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
};

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="page">
      <div class="toolbar">
        <div class="filter-bar" role="tablist" aria-label="Filter orders">
          <button
            class="filter-btn"
            role="tab"
            [class.active]="filter() === ''"
            (click)="loadOrders('')"
          >
            All
          </button>
          <button
            class="filter-btn"
            role="tab"
            [class.active]="filter() === 'PENDING'"
            (click)="loadOrders('PENDING')"
          >
            Pending
          </button>
          <button
            class="filter-btn"
            role="tab"
            [class.active]="filter() === 'CONFIRMED'"
            (click)="loadOrders('CONFIRMED')"
          >
            Confirmed
          </button>
          <button
            class="filter-btn"
            role="tab"
            [class.active]="filter() === 'SHIPPED'"
            (click)="loadOrders('SHIPPED')"
          >
            Shipped
          </button>
          <button
            class="filter-btn"
            role="tab"
            [class.active]="filter() === 'DELIVERED'"
            (click)="loadOrders('DELIVERED')"
          >
            Delivered
          </button>
        </div>

        <button class="btn btn-export btn-sm" type="button" (click)="exportCSV()">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export CSV
        </button>
      </div>

      @for (o of orders(); track o.id) {
        <div class="order-card card">
          <div class="order-header">
            <div>
              <h3>Order #{{ o.id }}</h3>
              <span class="order-date">{{ o.orderDate | date: 'medium' }}</span>
            </div>
            <div class="order-right">
              <span class="status-pill" [class]="'status-' + o.status">{{ o.status }}</span>
              <span class="order-total">\${{ o.grandTotal | number: '1.2-2' }}</span>
            </div>
          </div>

          <div class="order-store">
            {{ o.storeName }}<span class="dot">·</span>{{ o.paymentMethod }}
          </div>

          <div class="items-list">
            @for (item of o.items; track item.id) {
              <div class="item-row">
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-qty">×{{ item.quantity }}</span>
                <span class="item-price">\${{ item.price | number: '1.2-2' }}</span>
              </div>
            }
          </div>

          @if (o.shipment) {
            <div class="shipment-info">
              <div class="shipment-head">
                <span>{{ o.shipment.carrier }} · {{ o.shipment.mode }}</span>
                <span class="shipment-track">#{{ o.shipment.trackingNumber }}</span>
              </div>
              <div class="timeline">
                @for (step of steps(o); track step.key) {
                  <div class="timeline-step" [class.done]="step.state === 'done'"
                       [class.current]="step.state === 'current'">
                    <span class="step-dot" aria-hidden="true"></span>
                    <span>{{ step.label }}</span>
                  </div>
                }
              </div>
            </div>
          }

          @if (o.status === 'PENDING') {
            <div class="order-actions">
              <a [routerLink]="['/checkout', o.id]" class="btn btn-primary btn-sm">
                Pay with Stripe
              </a>
              <button class="btn btn-danger btn-sm" type="button" (click)="cancel(o.id)">
                Cancel order
              </button>
            </div>
          }
        </div>
      }

      @if (orders().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">📦</div>
          <div class="empty-title">No orders found</div>
          <div>When you place an order, it'll appear here.</div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./my-orders.scss'],
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

  /**
   * Derive the 5-step shipment timeline state from the order status.
   * Anything at or before the current flow index is `done`; the order's
   * own status is `current`; everything after is `todo`.
   * CANCELLED orders never reach shipment so we don't show this timeline.
   */
  steps(o: Order): { key: string; label: string; state: StepState }[] {
    const idx = FLOW.indexOf(o.status as (typeof FLOW)[number]);
    return FLOW.map((key, i) => ({
      key,
      label: FLOW_LABELS[key],
      state: idx === -1 ? 'todo' : i < idx ? 'done' : i === idx ? 'current' : 'todo',
    }));
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
