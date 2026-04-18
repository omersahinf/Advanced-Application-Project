import { Component, OnInit, signal, ElementRef, NgZone, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, KeyValuePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import {
  CorporateDashboard,
  CustomerSegmentation,
  RevenueDrillDown,
} from '../../models/product.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-corporate-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, KeyValuePipe, DatePipe, FormsModule],
  template: `
    <div class="page">
      <div class="welcome">
        <div class="welcome-copy">
          <h2>Welcome back{{ firstName() ? ', ' + firstName() : '' }} 👋</h2>
          <p>Here's what's happening with your store today.</p>
        </div>
        <div class="welcome-actions">
          <div class="date-picker">
            <input type="date" [(ngModel)]="startDate" (change)="onDateFilter()" />
            <span class="sep">→</span>
            <input type="date" [(ngModel)]="endDate" (change)="onDateFilter()" />
          </div>
          @if (startDate || endDate) {
            <button class="btn-clear" type="button" (click)="clearDateFilter()">Clear</button>
          }
          <button class="btn-configure" type="button" (click)="showConfig = !showConfig">
            {{ showConfig ? 'Done' : 'Configure widgets' }}
          </button>
        </div>
      </div>

      @if (showConfig) {
        <div class="widget-config">
          <h3>Toggle widgets</h3>
          <div class="config-options">
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['kpis']"
                (change)="toggleWidget('kpis')"
              />
              KPI cards
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['revenueChart']"
                (change)="toggleWidget('revenueChart')"
              />
              Revenue trend
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['orderChart']"
                (change)="toggleWidget('orderChart')"
              />
              Orders by status
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['productChart']"
                (change)="toggleWidget('productChart')"
              />
              Top products
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['segmentation']"
                (change)="toggleWidget('segmentation')"
              />
              Customer segmentation
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['quickLinks']"
                (change)="toggleWidget('quickLinks')"
              />
              Quick links
            </label>
          </div>
        </div>
      }

      @if (data(); as d) {
        @if (widgets()['kpis']) {
          <div class="kpi-grid">
            <div class="kpi-card kpi-brand">
              <div class="kpi-head">
                <div class="kpi-icon" aria-hidden="true">💰</div>
              </div>
              <div class="kpi-value">\${{ d.totalRevenue | number: '1.0-0' }}</div>
              <div class="kpi-label">Total revenue</div>
              <div class="kpi-sub">Lifetime across all orders</div>
            </div>
            <div class="kpi-card kpi-info">
              <div class="kpi-head">
                <div class="kpi-icon" aria-hidden="true">🛒</div>
              </div>
              <div class="kpi-value">{{ d.totalOrders | number }}</div>
              <div class="kpi-label">Orders</div>
              <div class="kpi-sub">All-time order count</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-head">
                <div class="kpi-icon" aria-hidden="true">📦</div>
              </div>
              <div class="kpi-value">{{ d.totalProducts | number }}</div>
              <div class="kpi-label">Products</div>
              <div class="kpi-sub">In your catalog</div>
            </div>
            <div class="kpi-card kpi-warn">
              <div class="kpi-head">
                <div class="kpi-icon" aria-hidden="true">⭐</div>
              </div>
              <div class="kpi-value">{{ d.avgRating | number: '1.1-1' }}</div>
              <div class="kpi-label">Avg rating</div>
              <div class="kpi-sub">Across all reviews</div>
            </div>
          </div>
        }

        @if (widgets()['revenueChart'] && hasMonthlyData(d)) {
          <div class="chart-wide">
            <h3>Revenue overview</h3>
            <p class="drill-hint">Click a point on the chart to drill down into that month.</p>
            <canvas data-chart="revenue"></canvas>
          </div>
        }

        @if (drillMonth(); as selectedMonth) {
          <div class="drilldown">
            <div class="drilldown-header">
              <h3>Revenue drill-down: {{ selectedMonth }}</h3>
              <button class="btn-clear" type="button" (click)="closeDrillDown()">Close</button>
            </div>

            @if (drillLoading()) {
              <p class="empty-drill">Loading drill-down…</p>
            } @else if (drillData(); as dd) {
              <div class="drill-kpis">
                <div class="drill-kpi">
                  <span class="dk-label">Revenue</span>
                  <span class="dk-value">\${{ dd.totalRevenue | number: '1.2-2' }}</span>
                </div>
                <div class="drill-kpi">
                  <span class="dk-label">Orders</span>
                  <span class="dk-value">{{ dd.orderCount }}</span>
                </div>
                <div class="drill-kpi">
                  <span class="dk-label">Avg order value</span>
                  <span class="dk-value">\${{ dd.avgOrderValue | number: '1.2-2' }}</span>
                </div>
              </div>

              @if (dd.topProducts.length > 0) {
                <h4>Top products</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of dd.topProducts; track p.productName) {
                      <tr>
                        <td>{{ p.productName }}</td>
                        <td>{{ p.orderCount }}</td>
                        <td>\${{ p.revenue | number: '1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }

              @if (dd.orders.length > 0) {
                <h4>Orders</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (o of dd.orders; track o.orderId) {
                      <tr>
                        <td>#{{ o.orderId }}</td>
                        <td>{{ o.orderDate | date: 'MMM d, y' }}</td>
                        <td>{{ o.customerName }}</td>
                        <td>
                          <span class="status-pill" [class]="'s-' + o.status.toLowerCase()">
                            {{ o.status }}
                          </span>
                        </td>
                        <td>\${{ o.grandTotal | number: '1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="empty-drill">No orders found for this month.</p>
              }
            }
          </div>
        }

        <div class="charts-row">
          @if (widgets()['orderChart']) {
            <div class="chart-card">
              <h3>Orders by status</h3>
              <canvas data-chart="order"></canvas>
            </div>
          }
          @if (widgets()['productChart']) {
            <div class="chart-card">
              <h3>Top products by revenue</h3>
              <canvas data-chart="product"></canvas>
            </div>
          }
        </div>

        @if (widgets()['segmentation'] && segmentation(); as seg) {
          <div class="segmentation-section">
            <h3>Customer segmentation</h3>
            <div class="seg-grid">
              <div class="seg-card">
                <div class="seg-value">{{ seg.totalCustomers }}</div>
                <div class="seg-label">Total customers</div>
              </div>
              <div class="seg-card">
                <div class="seg-value">\${{ seg.avgSpend | number: '1.2-2' }}</div>
                <div class="seg-label">Avg spend</div>
              </div>
            </div>
            <div class="seg-tables">
              <div class="seg-table">
                <h4>By membership</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Count</th>
                      <th>Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of seg.byMembership | keyvalue; track item.key) {
                      <tr>
                        <td>
                          <span class="badge" [class]="'badge-' + item.key.toLowerCase()">
                            {{ item.key }}
                          </span>
                        </td>
                        <td>{{ item.value }}</td>
                        <td>\${{ seg.spendByMembership[item.key] | number: '1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="seg-table">
                <h4>By city</h4>
                <table>
                  <thead>
                    <tr>
                      <th>City</th>
                      <th>Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of seg.byCity | keyvalue; track item.key) {
                      <tr>
                        <td>{{ item.key }}</td>
                        <td>{{ item.value }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        @if (widgets()['quickLinks']) {
          <div class="quick-links">
            <a routerLink="/corporate/products" class="quick-card">
              <span class="quick-icon" aria-hidden="true">📦</span>
              <span>Manage products</span>
            </a>
            <a routerLink="/corporate/orders" class="quick-card">
              <span class="quick-icon" aria-hidden="true">🛒</span>
              <span>Manage orders</span>
            </a>
            <a routerLink="/corporate/reviews" class="quick-card">
              <span class="quick-icon" aria-hidden="true">⭐</span>
              <span>View reviews</span>
            </a>
          </div>
        }
      } @else {
        <div class="loading">Loading dashboard…</div>
      }
    </div>
  `,
  styleUrls: ['./corporate-dashboard.scss'],
})
export class CorporateDashboardComponent implements OnInit {
  data = signal<CorporateDashboard | null>(null);
  segmentation = signal<CustomerSegmentation | null>(null);
  widgets = signal<Record<string, boolean>>({
    kpis: true,
    orderChart: true,
    productChart: true,
    revenueChart: true,
    segmentation: true,
    quickLinks: true,
  });
  showConfig = false;
  drillMonth = signal('');
  drillData = signal<RevenueDrillDown | null>(null);
  drillLoading = signal(false);
  startDate = '';
  endDate = '';
  firstName = signal<string>('');

  private orderChart: Chart | null = null;
  private productChart: Chart | null = null;
  private revenueChart: Chart | null = null;

  constructor(
    private dashboardService: DashboardService,
    private auth: AuthService,
    private zone: NgZone,
    private host: ElementRef<HTMLElement>,
  ) {
    const saved = localStorage.getItem('corporate_widgets');
    if (saved) this.widgets.set(JSON.parse(saved));

    effect(() => {
      const d = this.data();
      this.widgets();
      if (!d) return;
      requestAnimationFrame(() => requestAnimationFrame(() => this.tryRenderCharts(d, 0)));
    });
  }

  private getCanvas(name: string): HTMLCanvasElement | null {
    return this.host.nativeElement.querySelector<HTMLCanvasElement>(
      `canvas[data-chart="${name}"]`,
    );
  }

  toggleWidget(key: string) {
    const current = this.widgets();
    const updated = { ...current, [key]: !current[key] };
    this.widgets.set(updated);
    localStorage.setItem('corporate_widgets', JSON.stringify(updated));
  }

  ngOnInit() {
    this.firstName.set(this.auth.currentFirstName() || '');
    this.loadDashboard();
    this.dashboardService
      .getCorporateCustomerSegmentation()
      .subscribe((s) => this.segmentation.set(s));
  }

  loadDashboard() {
    this.dashboardService
      .getCorporateDashboard(this.startDate || undefined, this.endDate || undefined)
      .subscribe((d) => this.data.set(d));
  }

  private tryRenderCharts(d: CorporateDashboard, attempt: number) {
    const orderC = this.getCanvas('order');
    const productC = this.getCanvas('product');
    const revenueC = this.getCanvas('revenue');
    const ready =
      (!this.widgets()['orderChart'] || orderC) &&
      (!this.widgets()['productChart'] || productC) &&
      (!this.widgets()['revenueChart'] || !this.hasMonthlyData(d) || revenueC);
    if (ready) {
      try {
        this.renderCharts(d);
      } catch (e) {
        console.error('[charts] render failed', e);
      }
    } else if (attempt < 30) {
      setTimeout(() => this.tryRenderCharts(d, attempt + 1), 50);
    }
  }

  onDateFilter() {
    if (this.startDate && this.endDate) this.loadDashboard();
  }

  clearDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.loadDashboard();
  }

  hasMonthlyData(d: CorporateDashboard): boolean {
    return !!d.revenueByMonth && Object.keys(d.revenueByMonth).length > 0;
  }

  loadDrillDown(month: string) {
    this.drillData.set(null);
    this.drillLoading.set(true);
    this.dashboardService.getCorporateRevenueDrillDown(month).subscribe({
      next: (res) => {
        this.drillData.set(res);
        this.drillLoading.set(false);
      },
      error: () => this.drillLoading.set(false),
    });
  }

  closeDrillDown() {
    this.drillMonth.set('');
    this.drillData.set(null);
  }

  pickMonth(m: string) {
    this.drillMonth.set(m);
    this.loadDrillDown(m);
  }

  private renderCharts(d: CorporateDashboard) {
    if (this.orderChart) this.orderChart.destroy();
    if (this.productChart) this.productChart.destroy();
    if (this.revenueChart) this.revenueChart.destroy();

    // DS §1.9 color palette
    const donutPalette = ['#034f46', '#16a34a', '#ffa946', '#dfe9e5', '#7f1c34'];
    const fathom = '#034f46';
    const fathomFill = 'rgba(3, 79, 70, 0.10)';
    const axisColor = '#8a8a7c';
    const gridColor = '#d5d5c0';

    const statusLabels = Object.keys(d.ordersByStatus);
    const orderCanvas = this.getCanvas('order');
    const productCanvas = this.getCanvas('product');
    const revenueCanvas = this.getCanvas('revenue');

    [orderCanvas, productCanvas, revenueCanvas].forEach((c) => {
      if (!c) return;
      Chart.getChart(c)?.destroy();
      c.onclick = null;
      c.onmousemove = null;
    });

    if (orderCanvas) {
      this.orderChart = new Chart(orderCanvas, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [
            {
              data: statusLabels.map((k) => d.ordersByStatus[k]),
              backgroundColor: statusLabels.map((k, i) =>
                k.toUpperCase() === 'CANCELLED' ? '#7f1c34' : donutPalette[i % donutPalette.length],
              ),
              borderColor: '#faf8ea',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: axisColor, font: { size: 11 }, boxWidth: 10, padding: 12 },
            },
          },
          cutout: '62%',
        },
      });
    }

    if (productCanvas) {
      this.productChart = new Chart(productCanvas, {
        type: 'bar',
        data: {
          labels: d.topProducts.map((p) => p.productName),
          datasets: [
            {
              label: 'Revenue ($)',
              data: d.topProducts.map((p) => p.revenue),
              backgroundColor: fathom,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: axisColor, font: { size: 11 } },
              grid: { color: gridColor, tickBorderDash: [4, 4] },
            },
            y: {
              ticks: { color: axisColor, font: { size: 11 } },
              grid: { display: false },
            },
          },
        },
      });
    }

    if (revenueCanvas && d.revenueByMonth && Object.keys(d.revenueByMonth).length > 0) {
      const months = Object.keys(d.revenueByMonth).sort();
      this.revenueChart = new Chart(revenueCanvas, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Revenue ($)',
              data: months.map((m) => d.revenueByMonth[m]),
              borderColor: fathom,
              backgroundColor: fathomFill,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: fathom,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 9,
              pointHitRadius: 0,
              borderWidth: 2.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'nearest', intersect: true },
          onHover: (event: any, elements: any[]) => {
            const target = event?.native?.target as HTMLCanvasElement | undefined;
            if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          },
          onClick: (event: any) => {
            const nativeEvent = event?.native ?? event;
            const activePoints =
              this.revenueChart?.getElementsAtEventForMode(
                nativeEvent,
                'nearest',
                { intersect: true },
                true,
              ) ?? [];
            if (activePoints.length > 0) {
              const idx = activePoints[0].index;
              this.zone.run(() => this.pickMonth(months[idx]));
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'nearest', intersect: true },
          },
          scales: {
            x: {
              ticks: { color: axisColor, font: { size: 11 } },
              grid: { color: gridColor, tickBorderDash: [4, 4] },
            },
            y: {
              beginAtZero: true,
              ticks: { color: axisColor, font: { size: 11 } },
              grid: { color: gridColor, tickBorderDash: [4, 4] },
            },
          },
        },
      });
    }
  }
}
