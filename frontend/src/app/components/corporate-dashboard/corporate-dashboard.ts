import { Component, OnInit, signal, ElementRef, NgZone, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import {
  CorporateDashboard,
  CustomerSegmentation,
  RevenueDrillDown,
} from '../../models/product.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-corporate-dashboard',
  imports: [RouterLink, DecimalPipe, KeyValuePipe, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        @if (data(); as d) {
          <div class="header-top">
            <div>
              <h1>Welcome back! 👋</h1>
              <p>Here's what's happening with your store today</p>
            </div>
            <div class="date-filter">
              <input type="date" [(ngModel)]="startDate" (change)="onDateFilter()" />
              <input type="date" [(ngModel)]="endDate" (change)="onDateFilter()" />
              @if (startDate || endDate) {
                <button class="btn-clear" (click)="clearDateFilter()">Clear</button>
              }
              <button class="btn-configure" (click)="showConfig = !showConfig">
                {{ showConfig ? 'Done' : '⚙️' }}
              </button>
            </div>
          </div>
        }
      </div>

      @if (showConfig) {
        <div class="widget-config card">
          <h3>Toggle Widgets</h3>
          <div class="config-options">
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['kpis']"
                (change)="toggleWidget('kpis')"
              />
              KPI Cards</label
            >
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['orderChart']"
                (change)="toggleWidget('orderChart')"
              />
              Orders by Status</label
            >
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['productChart']"
                (change)="toggleWidget('productChart')"
              />
              Top Products</label
            >
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['revenueChart']"
                (change)="toggleWidget('revenueChart')"
              />
              Revenue Trend</label
            >
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['segmentation']"
                (change)="toggleWidget('segmentation')"
              />
              Customer Segmentation</label
            >
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['quickLinks']"
                (change)="toggleWidget('quickLinks')"
              />
              Quick Links</label
            >
          </div>
        </div>
      }

      @if (data(); as d) {
        @if (widgets()['kpis']) {
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon-circle gold">💰</div>
              <div class="kpi-value">\${{ d.totalRevenue | number: '1.0-0' }}</div>
              <div class="kpi-label">Total Revenue</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon-circle blue">🛒</div>
              <div class="kpi-value">{{ d.totalOrders | number }}</div>
              <div class="kpi-label">Total Orders</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon-circle teal">📦</div>
              <div class="kpi-value">{{ d.totalProducts | number }}</div>
              <div class="kpi-label">Products</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon-circle green">⭐</div>
              <div class="kpi-value">{{ d.avgRating | number: '1.1-1' }}</div>
              <div class="kpi-label">Avg Rating</div>
            </div>
          </div>
        }

        @if (widgets()['revenueChart'] && d.revenueByMonth && hasMonthlyData(d)) {
          <div class="chart-wide card">
            <h3>Revenue Overview</h3>
            <p class="drill-hint">Click a point on the chart to drill down into that month</p>
            <canvas data-chart="revenue"></canvas>
          </div>
        }

        @if (drillMonth(); as selectedMonth) {
          <div class="drilldown card">
            <div class="drilldown-header">
              <h3>Revenue Drill-Down: {{ selectedMonth }}</h3>
              <button class="btn-clear" (click)="closeDrillDown()">Close</button>
            </div>

            @if (drillLoading()) {
              <p>Loading drill-down…</p>
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
                  <span class="dk-label">Avg Order Value</span>
                  <span class="dk-value">\${{ dd.avgOrderValue | number: '1.2-2' }}</span>
                </div>
              </div>

              @if (dd.topProducts.length > 0) {
                <h4 class="drill-section-title">Top Products in {{ selectedMonth }}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Sold</th>
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
                <h4 class="drill-section-title">Orders in {{ selectedMonth }}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
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
                        <td>{{ o.orderDate.substring(0, 10) }}</td>
                        <td>{{ o.customerName }}</td>
                        <td>
                          <span class="status-badge" [class]="'s-' + o.status.toLowerCase()">{{
                            o.status
                          }}</span>
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
            <div class="chart-card card">
              <h3>Orders by Status</h3>
              <canvas data-chart="order"></canvas>
            </div>
          }
          @if (widgets()['productChart']) {
            <div class="chart-card card">
              <h3>Top Products by Revenue</h3>
              <canvas data-chart="product"></canvas>
            </div>
          }
        </div>

        @if (widgets()['segmentation'] && segmentation(); as seg) {
          <div class="segmentation-section card">
            <h3>Customer Segmentation & Behavior</h3>
            <div class="seg-grid">
              <div class="seg-card">
                <div class="seg-value">{{ seg.totalCustomers }}</div>
                <div class="seg-label">Total Customers</div>
              </div>
              <div class="seg-card">
                <div class="seg-value">\${{ seg.avgSpend | number: '1.2-2' }}</div>
                <div class="seg-label">Avg Spend</div>
              </div>
            </div>
            <div class="seg-tables">
              <div class="seg-table">
                <h4>By Membership</h4>
                <table>
                  <tr>
                    <th>Type</th>
                    <th>Count</th>
                    <th>Spend</th>
                  </tr>
                  @for (item of seg.byMembership | keyvalue; track item.key) {
                    <tr>
                      <td>
                        <span class="badge" [class]="'badge-' + item.key.toLowerCase()">{{
                          item.key
                        }}</span>
                      </td>
                      <td>{{ item.value }}</td>
                      <td>\${{ seg.spendByMembership[item.key] | number: '1.2-2' }}</td>
                    </tr>
                  }
                </table>
              </div>
              <div class="seg-table">
                <h4>By City</h4>
                <table>
                  <tr>
                    <th>City</th>
                    <th>Customers</th>
                  </tr>
                  @for (item of seg.byCity | keyvalue; track item.key) {
                    <tr>
                      <td>{{ item.key }}</td>
                      <td>{{ item.value }}</td>
                    </tr>
                  }
                </table>
              </div>
            </div>
          </div>
        }

        @if (widgets()['quickLinks']) {
          <div class="quick-links">
            <a routerLink="/corporate/products" class="quick-card card">
              <span class="quick-icon">📦</span>
              <span>Manage Products</span>
            </a>
            <a routerLink="/corporate/orders" class="quick-card card">
              <span class="quick-icon">🛒</span>
              <span>Manage Orders</span>
            </a>
            <a routerLink="/corporate/reviews" class="quick-card card">
              <span class="quick-icon">⭐</span>
              <span>View Reviews</span>
            </a>
          </div>
        }
      } @else {
        <div class="loading">Loading dashboard...</div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
      }
      .page-header {
        margin-bottom: 28px;
      }
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        flex-wrap: wrap;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .page-header p {
        color: #666;
        font-size: 14px;
        margin-top: 4px;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 28px;
      }
      .kpi-card {
        background: #ffffeb;
        border-radius: 16px;
        padding: 20px;
        border: 1px solid #d5d5c0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        transition: transform 0.15s;
      }
      .kpi-card:hover {
        transform: translateY(-2px);
      }
      .kpi-icon-circle {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        margin-bottom: 12px;
      }
      .kpi-icon-circle.gold {
        background: #fef3c7;
      }
      .kpi-icon-circle.blue {
        background: #034f46;
      }
      .kpi-icon-circle.teal {
        background: rgba(20, 184, 166, 0.12);
      }
      .kpi-icon-circle.green {
        background: #dcfce7;
      }
      .kpi-value {
        font-size: 26px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .kpi-label {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
        font-weight: 500;
      }

      .charts-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      .chart-wide {
        padding: 20px;
        margin-bottom: 28px;
      }
      .chart-wide h3,
      .chart-card h3 {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #1a1a1a;
      }
      .chart-card {
        padding: 20px;
      }
      .chart-wide canvas {
        width: 100% !important;
        height: 440px !important;
        max-height: 440px;
        display: block;
      }
      .chart-card canvas {
        width: 100% !important;
        height: 320px !important;
        max-height: 320px;
        display: block;
      }

      .quick-links {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .quick-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px;
        text-decoration: none;
        color: #1a1a1a;
        font-weight: 600;
        transition: all 0.15s;
      }
      .quick-card:hover {
        transform: translateY(-2px);
        border-color: rgba(3, 79, 70, 0.3);
      }
      .quick-icon {
        font-size: 24px;
      }

      .date-filter {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .date-filter input {
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 13px;
        width: auto;
      }
      .btn-clear {
        padding: 6px 14px;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        background: #ffffeb;
        font-size: 13px;
        cursor: pointer;
        color: #666;
      }
      .btn-clear:hover {
        background: #f5f5e1;
        color: #1a1a1a;
      }

      .segmentation-section {
        padding: 20px;
        margin-bottom: 20px;
      }
      .segmentation-section h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #1a1a1a;
      }
      .seg-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .seg-card {
        background: #f5f5e1;
        border-radius: 8px;
        padding: 14px;
        text-align: center;
      }
      .seg-value {
        font-size: 22px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .seg-label {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
        margin-top: 4px;
      }
      .seg-tables {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .seg-table h4 {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #666;
      }
      .seg-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .seg-table th {
        text-align: left;
        padding: 6px 8px;
        border-bottom: 1px solid #d5d5c0;
        color: #666;
        font-weight: 600;
      }
      .seg-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #d5d5c0;
        color: #1a1a1a;
      }
      .badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-gold {
        background: #fef3c7;
        color: #d97706;
      }
      .badge-silver {
        background: #f1f5f9;
        color: #64748b;
      }
      .badge-bronze {
        background: #fff7ed;
        color: #ea580c;
      }

      .drill-hint {
        font-size: 11px;
        color: #999;
        margin-bottom: 8px;
      }
      .month-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #ebe6dc;
      }
      .month-chip {
        background: #ffffeb;
        border: 1.5px solid #d5d5c0;
        color: #1a1a1a;
        font-size: 12px;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .month-chip:hover {
        border-color: #034f46;
        color: #034f46;
      }
      .month-chip.active {
        background: #034f46;
        border-color: #034f46;
        color: #ffffeb;
      }
      .drilldown {
        padding: 20px;
        margin-bottom: 20px;
      }
      .drill-kpis {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      .drill-kpi {
        background: #f5f5d8;
        border: 1px solid #d5d5c0;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .dk-label {
        font-size: 11px;
        text-transform: uppercase;
        color: #6b6b58;
        font-weight: 600;
        letter-spacing: 0.4px;
      }
      .dk-value {
        font-size: 18px;
        font-weight: 700;
        color: #034f46;
      }
      .drill-section-title {
        margin: 16px 0 8px;
        font-size: 13px;
        font-weight: 700;
        color: #1a1a1a;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .empty-drill {
        color: #999;
        font-size: 13px;
        padding: 8px 0;
      }
      @media (max-width: 768px) {
        .drill-kpis {
          grid-template-columns: 1fr;
        }
      }
      .drilldown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .drilldown h3 {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .drilldown table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .drilldown th {
        text-align: left;
        padding: 8px;
        border-bottom: 1px solid #d5d5c0;
        color: #666;
        font-weight: 600;
      }
      .drilldown td {
        padding: 8px;
        border-bottom: 1px solid #d5d5c0;
        color: #1a1a1a;
      }

      .btn-configure {
        padding: 6px 12px;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        background: #ffffeb;
        font-size: 14px;
        cursor: pointer;
        font-family: inherit;
        color: #666;
      }
      .btn-configure:hover {
        background: #f5f5e1;
        color: #1a1a1a;
      }
      .widget-config {
        padding: 16px;
        margin-bottom: 20px;
      }
      .widget-config h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #1a1a1a;
      }
      .config-options {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
      .config-options label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        cursor: pointer;
        color: #1a1a1a;
      }
      .loading {
        text-align: center;
        padding: 60px;
        color: #666;
      }

      @media (max-width: 768px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .charts-row {
          grid-template-columns: 1fr;
        }
        .header-top {
          flex-direction: column;
        }
      }
    `,
  ],
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
  private orderChart: Chart | null = null;
  private productChart: Chart | null = null;
  private revenueChart: Chart | null = null;

  constructor(
    private dashboardService: DashboardService,
    private zone: NgZone,
    private host: ElementRef<HTMLElement>,
  ) {
    const saved = localStorage.getItem('corporate_widgets');
    if (saved) this.widgets.set(JSON.parse(saved));

    // Re-render charts whenever data() or widget visibility changes.
    // Wait two animation frames so Angular finishes rendering and the browser
    // finishes layout/paint before we hand canvases to Chart.js.
    effect(() => {
      const d = this.data();
      this.widgets();
      if (!d) return;
      requestAnimationFrame(() => requestAnimationFrame(() => this.tryRenderCharts(d, 0)));
    });
  }

  private getCanvas(name: string): HTMLCanvasElement | null {
    return this.host.nativeElement.querySelector<HTMLCanvasElement>(`canvas[data-chart="${name}"]`);
  }

  toggleWidget(key: string) {
    const current = this.widgets();
    const updated = { ...current, [key]: !current[key] };
    this.widgets.set(updated);
    localStorage.setItem('corporate_widgets', JSON.stringify(updated));
    // chart re-render handled by effect()
  }

  ngOnInit() {
    this.loadDashboard();
    this.dashboardService
      .getCorporateCustomerSegmentation()
      .subscribe((s) => this.segmentation.set(s));
  }

  loadDashboard() {
    this.dashboardService
      .getCorporateDashboard(this.startDate || undefined, this.endDate || undefined)
      .subscribe((d) => {
        this.data.set(d);
        // chart render is triggered by effect() reacting to data() change
      });
  }

  private tryRenderCharts(d: CorporateDashboard, attempt: number) {
    const orderC = this.getCanvas('order');
    const productC = this.getCanvas('product');
    const revenueC = this.getCanvas('revenue');
    const ready =
      (!this.widgets()['orderChart'] || orderC) &&
      (!this.widgets()['productChart'] || productC) &&
      (!this.widgets()['revenueChart'] || !this.hasMonthlyData(d) || revenueC);
    // eslint-disable-next-line no-console
    console.log('[charts] attempt', attempt, {
      orderC: !!orderC,
      productC: !!productC,
      revenueC: !!revenueC,
      ready: !!ready,
    });
    if (ready) {
      try {
        this.renderCharts(d);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[charts] render failed', e);
      }
    } else if (attempt < 30) {
      setTimeout(() => this.tryRenderCharts(d, attempt + 1), 50);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[charts] gave up after 30 attempts');
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
    return d.revenueByMonth && Object.keys(d.revenueByMonth).length > 0;
  }

  loadDrillDown(month: string) {
    this.drillData.set(null);
    this.drillLoading.set(true);
    this.dashboardService.getCorporateRevenueDrillDown(month).subscribe({
      next: (res) => {
        this.drillData.set(res);
        this.drillLoading.set(false);
      },
      error: () => {
        this.drillLoading.set(false);
      },
    });
  }

  closeDrillDown() {
    this.drillMonth.set('');
    this.drillData.set(null);
  }

  monthKeys(d: CorporateDashboard): string[] {
    return d.revenueByMonth ? Object.keys(d.revenueByMonth).sort() : [];
  }

  pickMonth(m: string) {
    this.drillMonth.set(m);
    this.loadDrillDown(m);
  }

  private renderCharts(d: CorporateDashboard) {
    if (this.orderChart) this.orderChart.destroy();
    if (this.productChart) this.productChart.destroy();
    if (this.revenueChart) this.revenueChart.destroy();
    const colors = ['#8b7cf6', '#f472b6', '#06b6d4', '#f59e0b', '#a78bfa'];
    const chartTextColor = '#6b7280';
    const gridColor = '#ebe6dc';
    const statusLabels = Object.keys(d.ordersByStatus);
    const orderCanvas = this.getCanvas('order');
    const productCanvas = this.getCanvas('product');
    const revenueCanvas = this.getCanvas('revenue');

    // Defensive cleanup: a stale Chart.js instance may still be tied to the canvas
    // after a refresh/HMR. Destroy whatever Chart.js thinks is on it AND remove any
    // native click/move handlers set by previous renders (they capture stale chart refs).
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
            { data: statusLabels.map((k) => d.ordersByStatus[k]), backgroundColor: colors },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: chartTextColor } } },
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
              backgroundColor: '#8b7cf6',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
            y: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
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
              borderColor: '#034f46',
              backgroundColor: 'rgba(3, 79, 70, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#034f46',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 8,
              pointHoverRadius: 11,
              // Only the visible point should be interactive.
              pointHitRadius: 0,
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
              this.zone.run(() => {
                this.pickMonth(months[idx]);
              });
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'nearest', intersect: true },
          },
          scales: {
            x: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
            y: { beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: gridColor } },
          },
        },
      });
    }
  }
}
