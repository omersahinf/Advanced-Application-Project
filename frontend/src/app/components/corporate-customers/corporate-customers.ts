import { Component, OnInit, signal, computed } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Order, Shipment } from '../../models/product.model';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { finalize } from 'rxjs';

interface CustomerRow {
  userId: number;
  name: string;
  initials: string;
  avatarColor: string;
  city: string;
  membership: string;
  totalSpend: number;
  ordersCount: number;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-corporate-customers',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, StatusPillComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="page-title-block">
          <h1 class="page-title">
            Customer Management
            <span class="title-emoji" aria-hidden="true">👥</span>
          </h1>
          <div class="page-sub">View and manage your customers</div>
        </div>

        <button type="button" class="btn btn-primary" aria-label="Add Customer">
          + Add Customer
        </button>
      </div>

      <div class="metrics-grid">
        <kpi-card
          label="Total Customers"
          [value]="totalCustomers()"
          sub="across your store"
          icon="users"
        />

        <kpi-card
          label="New This Month"
          [value]="newThisMonth()"
          sub="unique new buyers"
          icon="star"
        />

        <kpi-card label="Gold Members" [value]="goldMembers()" sub="premium tier" icon="star" />

        <kpi-card
          label="Avg. LTV"
          [value]="(avgLtv() | currency: 'USD' : 'symbol' : '1.0-0') || '$0'"
          sub="spend per customer"
          icon="chart"
        />
      </div>

      <div class="card customers-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="col-uppercase">Customer</th>
                <th class="col-uppercase">Membership</th>
                <th class="col-uppercase">Total Spend</th>
                <th class="col-uppercase" style="width:100px;">Orders</th>
                <th class="col-uppercase" style="width:120px;">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (c of customers(); track c.userId) {
                <tr>
                  <!-- Avatar + Info -->
                  <td>
                    <div class="customer-cell">
                      <div class="avatar" [style.backgroundColor]="c.avatarColor">
                        {{ c.initials }}
                      </div>
                      <div class="customer-detail">
                        <span class="customer-name">{{ c.name }}</span>
                        <span class="customer-city">{{ c.city }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Membership -->
                  <td>
                    <div class="membership-cell">
                      <span>{{ getMembershipIcon(c.membership) }}</span>
                      {{ c.membership }}
                    </div>
                  </td>

                  <!-- Spend -->
                  <td class="c-spend">{{ c.totalSpend | currency }}</td>

                  <!-- Orders -->
                  <td class="c-orders">{{ c.ordersCount }}</td>

                  <!-- Status -->
                  <td>
                    <status-pill [status]="c.status" />
                  </td>
                </tr>
              }

              @if (!loading() && customers().length === 0) {
                <tr>
                  <td colspan="5">
                    <div class="empty">
                      <div class="empty-icon">👥</div>
                      <div class="empty-title">No customers yet</div>
                      <p>When users buy your products, they will appear here.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./corporate-customers.scss'],
})
export class CorporateCustomersComponent implements OnInit {
  loading = signal(true);
  orders = signal<Order[]>([]);
  customers = signal<CustomerRow[]>([]);

  // Derived KPIs
  totalCustomers = computed(() => this.customers().length);
  newThisMonth = computed(() => Math.floor(this.customers().length * 0.2) + 1); // Mocked based on orders logic
  goldMembers = computed(() => this.customers().filter((c) => c.membership === 'GOLD').length);
  avgLtv = computed(() => {
    const list = this.customers();
    if (!list.length) return 0;
    const total = list.reduce((sum, c) => sum + c.totalSpend, 0);
    return total / list.length;
  });

  constructor(
    private title: Title,
    private orderService: OrderService,
  ) {
    this.title.setTitle('Customer Management · Flower');
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.loading.set(true);
    this.orderService
      .getStoreOrders()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.orders.set(res);
          this.aggregateCustomers(res);
        },
        error: (err) => console.error('Failed to load customers from orders:', err),
      });
  }

  private aggregateCustomers(orders: Order[]) {
    const map = new Map<number, CustomerRow>();

    // Color palette based on Flower theme for avatars
    const colors = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];

    for (const o of orders) {
      if (!map.has(o.userId)) {
        // Safe mapping in case userCity/userMembership are undefined at first API response
        const nameParts = (o.userName || 'Unknown').split(' ');
        const initials =
          nameParts.length > 1 ? nameParts[0][0] + nameParts[1][0] : nameParts[0].substring(0, 2);

        map.set(o.userId, {
          userId: o.userId,
          name: o.userName,
          initials: initials.toUpperCase(),
          avatarColor: colors[o.userId % colors.length],
          city: (o as any).userCity || 'Unknown City',
          membership: (o as any).userMembership || 'BRONZE',
          totalSpend: 0,
          ordersCount: 0,
          status: 'Active',
        });
      }

      const c = map.get(o.userId)!;
      c.ordersCount += 1;
      // Refunded/cancelled orders don't count toward lifetime spend
      if (o.status !== 'RETURNED' && o.status !== 'CANCELLED') {
        c.totalSpend += o.grandTotal;
      }
    }

    // Convert map to array and sort by Total Spend descending
    const list = Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
    this.customers.set(list);
  }

  getMembershipIcon(tier: string): string {
    switch (tier.toUpperCase()) {
      case 'GOLD':
        return '👑';
      case 'SILVER':
        return '🥈';
      case 'BRONZE':
        return '🥉';
      default:
        return '👤';
    }
  }
}
