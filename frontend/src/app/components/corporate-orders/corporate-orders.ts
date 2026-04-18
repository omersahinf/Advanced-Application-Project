import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/product.model';

type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

@Component({
  selector: 'app-corporate-orders',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    <div class="page">
      <div class="toolbar">
        @for (f of filters; track f.value) {
          <button
            type="button"
            class="filter-chip"
            [class.active]="statusFilter() === f.value"
            (click)="statusFilter.set(f.value)"
          >
            {{ f.label }}
          </button>
        }

        <div class="date-filter">
          <label>
            From
            <input type="date" [(ngModel)]="startDate" (change)="filterByDate()" />
          </label>
          <label>
            To
            <input type="date" [(ngModel)]="endDate" (change)="filterByDate()" />
          </label>
          @if (startDate || endDate) {
            <button type="button" class="btn-clear" (click)="clearDateFilter()">Clear</button>
          }
        </div>
      </div>

      <div class="table-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (o of visibleOrders(); track o.id) {
                <tr>
                  <td class="cell-order-id">#{{ o.id }}</td>
                  <td>
                    <div class="customer-cell">
                      <span class="avatar-pill" aria-hidden="true">{{
                        avatarInitial(o.userName)
                      }}</span>
                      <span class="customer-name">{{ o.userName }}</span>
                    </div>
                  </td>
                  <td>{{ o.items.length || 0 }} items</td>
                  <td class="cell-total">\${{ o.grandTotal | number: '1.2-2' }}</td>
                  <td>{{ o.orderDate | date: 'MMM d, y' }}</td>
                  <td>
                    <span class="status-pill" [class]="'s-' + o.status.toLowerCase()">
                      {{ o.status }}
                    </span>
                  </td>
                  <td style="text-align:right">
                    @if (o.status === 'PENDING') {
                      <button
                        class="btn-action"
                        type="button"
                        (click)="updateStatus(o.id, 'CONFIRMED')"
                      >
                        Confirm
                      </button>
                    } @else if (o.status === 'CONFIRMED') {
                      <button
                        class="btn-action"
                        type="button"
                        (click)="updateStatus(o.id, 'SHIPPED')"
                      >
                        Ship
                      </button>
                    } @else if (o.status === 'SHIPPED') {
                      <button
                        class="btn-action"
                        type="button"
                        (click)="updateStatus(o.id, 'DELIVERED')"
                      >
                        Mark delivered
                      </button>
                    }
                  </td>
                </tr>
                @if (o.items && o.items.length > 0) {
                  <tr class="detail-row">
                    <td class="detail-cell" colspan="7">
                      <div class="items-detail">
                        @for (item of o.items; track item.id) {
                          <span class="item-pill">
                            {{ item.productName }} × {{ item.quantity }} (\${{
                              item.price | number: '1.2-2'
                            }})
                          </span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (visibleOrders().length === 0) {
          <div class="empty-state" style="padding:40px 16px">
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
  filteredByDate = signal<Order[]>([]);
  statusFilter = signal<StatusFilter>('ALL');
  startDate = '';
  endDate = '';

  filters: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  visibleOrders = computed(() => {
    const list = this.filteredByDate();
    const s = this.statusFilter();
    return s === 'ALL' ? list : list.filter((o) => o.status === s);
  });

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.orderService.getStoreOrders().subscribe((o) => {
      this.allOrders.set(o);
      this.filteredByDate.set(o);
    });
  }

  filterByDate() {
    let filtered = this.allOrders();
    if (this.startDate) {
      const start = new Date(this.startDate);
      filtered = filtered.filter((o) => new Date(o.orderDate) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.orderDate) <= end);
    }
    this.filteredByDate.set(filtered);
  }

  clearDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.filteredByDate.set(this.allOrders());
  }

  updateStatus(orderId: number, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe(() => this.load());
  }

  avatarInitial(name: string | undefined): string {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  }
}
