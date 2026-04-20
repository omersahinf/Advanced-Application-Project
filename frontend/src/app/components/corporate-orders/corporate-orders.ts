/**
 * Corporate Orders — pixel-parity replica of Flower Prototype.html §CorpOrders.
 *
 * Inventory (verbatim from prototype):
 *   Page title:   "Orders Management 🛒"   (serif, 32px, title-emoji 28px)
 *   Subtitle:     "Track and manage all orders"
 *   Primary CTA:  [+ New Order]             (top-right, btn-primary — no
 *                                            click wired, same as prototype)
 *   Filters row:  [All Status ▾ 140w]       All Status / Pending /
 *                                            Confirmed / Shipped /
 *                                            Delivered / Cancelled
 *                 [All Time ▾ 140w]         All Time / Last 7 days /
 *                                            Last 30 days / Last 90 days
 *   Table card (padding 0):
 *     thead: ORDER ID · CUSTOMER · ITEMS · TOTAL · DATE · STATUS · (blank)
 *            letter-spacing: 1, font-size 11
 *     row:   #ORD-0001 (mono, #034f46, weight 500)
 *            [avatar (32/8r, hashed color, white weight-700 initials) · name (500)]
 *            "{n} item(s)" (text-2)
 *            "$total" (weight 700)
 *            date  (text-2; fmtDate → "Mar 10, 2025")
 *            <status-pill>
 *            [Confirm | Mark shipped | Mark delivered]   btn-sm btn-primary
 *            (only for PENDING / CONFIRMED / SHIPPED)
 *
 * Everything our previous implementation layered on (chip filters, from/to
 * date pickers, items-pill expansion row, custom .status-pill classes)
 * is out of the prototype and has been removed for pixel parity.
 *
 * Backend contracts (`OrderService.getStoreOrders`, `.updateOrderStatus`)
 * are untouched.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type TimeFilter = 'ALL' | '7D' | '30D' | '90D';

const AVATAR_COLORS = [
  '#7c3aed',
  '#0d9488',
  '#f59e0b',
  '#dc2626',
  '#2563eb',
  '#db2777',
  '#16a34a',
  '#9333ea',
];

@Component({
  selector: 'app-corporate-orders',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, FlowerIconComponent, StatusPillComponent],
  template: `
    <div class="page">
      <!-- Page header ————————————————————————————————— -->
      <div class="page-header">
        <div class="page-title-block">
          <h1 class="page-title">
            Orders Management <span class="title-emoji" aria-hidden="true">🛒</span>
          </h1>
          <div class="page-sub">Track and manage all orders</div>
        </div>
        <button type="button" class="btn btn-primary">
          <flower-icon name="plus" [size]="13" />
          New Order
        </button>
      </div>

      <!-- Filters row ————————————————————————————————— -->
      <div class="filters">
        <select
          class="select filter-select"
          [(ngModel)]="statusFilter"
          [ngModelOptions]="{ standalone: true }"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          class="select filter-select"
          [(ngModel)]="timeFilter"
          [ngModelOptions]="{ standalone: true }"
        >
          <option value="ALL">All Time</option>
          <option value="7D">Last 7 days</option>
          <option value="30D">Last 30 days</option>
          <option value="90D">Last 90 days</option>
        </select>
      </div>

      <!-- Orders table ————————————————————————————————— -->
      <div class="card orders-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="col-uppercase">ORDER ID</th>
                <th class="col-uppercase">CUSTOMER</th>
                <th class="col-uppercase">ITEMS</th>
                <th class="col-uppercase">TOTAL</th>
                <th class="col-uppercase">DATE</th>
                <th class="col-uppercase">STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (o of visibleOrders(); track o.id) {
                <tr>
                  <td class="c-order-id">#ORD-{{ padId(o.id) }}</td>
                  <td>
                    <div class="customer-cell">
                      <span class="avatar" [style.background]="avatarColor(o.userName)">
                        {{ initials(o.userName) }}
                      </span>
                      <span class="customer-name">{{ o.userName }}</span>
                    </div>
                  </td>
                  <td class="c-items">
                    {{ o.items.length }} {{ o.items.length === 1 ? 'item' : 'items' }}
                  </td>
                  <td class="c-total">\${{ o.grandTotal | number: '1.2-2' }}</td>
                  <td class="c-date">{{ o.orderDate | date: 'MMM d, y' }}</td>
                  <td><status-pill [status]="o.status" /></td>
                  <td class="c-action">
                    @if (o.paymentMethod === 'COD') {
                      <!-- Cash on delivery flow: keep 'Confirm' visible until paid -->
                      @if (o.status === 'PENDING') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'CONFIRMED')">Confirm</button>
                        <button type="button" class="btn btn-sm btn-outline" style="margin-left:8px;" (click)="updateStatus(o.id, 'SHIPPED')">Mark shipped</button>
                      } @else if (o.status === 'SHIPPED') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'CONFIRMED')">Confirm</button>
                        <button type="button" class="btn btn-sm btn-outline" style="margin-left:8px;" (click)="updateStatus(o.id, 'DELIVERED')">Mark delivered</button>
                      } @else if (o.status === 'DELIVERED') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'CONFIRMED')">Confirm</button>
                      } @else if (o.status === 'CONFIRMED') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'SHIPPED')">Mark shipped</button>
                      }
                    } @else {
                      <!-- Credit card / Normal flow -->
                      @if (o.status === 'PENDING') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'CONFIRMED')">Confirm</button>
                      } @else if (o.status === 'CONFIRMED') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'SHIPPED')">Mark shipped</button>
                      } @else if (o.status === 'SHIPPED') {
                        <button type="button" class="btn btn-sm btn-primary" (click)="updateStatus(o.id, 'DELIVERED')">Mark delivered</button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (visibleOrders().length === 0) {
          <div class="empty">
            <div class="empty-icon" aria-hidden="true">📭</div>
            <div class="empty-title">No orders match these filters</div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./corporate-orders.scss'],
})
export class CorporateOrdersComponent implements OnInit {
  allOrders = signal<Order[]>([]);
  statusFilter: StatusFilter = 'ALL';
  timeFilter: TimeFilter = 'ALL';

  visibleOrders = computed(() => {
    const list = this.allOrders();
    const s = this.statusFilter;
    const t = this.timeFilter;
    const now = Date.now();
    const windowMs: Record<TimeFilter, number | null> = {
      ALL: null,
      '7D': 7 * 86400_000,
      '30D': 30 * 86400_000,
      '90D': 90 * 86400_000,
    };
    const cutoff = windowMs[t];
    return list.filter((o) => {
      if (s !== 'ALL' && o.status !== s) return false;
      if (cutoff !== null) {
        const d = new Date(o.orderDate).getTime();
        if (isNaN(d) || now - d > cutoff) return false;
      }
      return true;
    });
  });

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.orderService.getStoreOrders().subscribe((o) => this.allOrders.set(o));
  }

  updateStatus(orderId: number, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe(() => this.load());
  }

  padId(id: number): string {
    return String(id).padStart(4, '0');
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  avatarColor(name: string | undefined): string {
    const n = name || '?';
    let h = 0;
    for (let i = 0; i < n.length; i += 1) {
      h = (Math.imul(h, 31) + n.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }
}
