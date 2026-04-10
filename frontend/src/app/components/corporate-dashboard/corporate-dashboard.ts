import { Component, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { CorporateDashboard, CustomerSegmentation } from '../../models/product.model';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-corporate-dashboard',
  imports: [RouterLink, DecimalPipe, KeyValuePipe, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        @if (data(); as d) {
          <h1>{{ d.storeName }}</h1>
          <p>Store Dashboard</p>
        }
        <div class="date-filter">
          <label>From:</label>
          <input type="date" [(ngModel)]="startDate" (change)="onDateFilter()" />
          <label>To:</label>
          <input type="date" [(ngModel)]="endDate" (change)="onDateFilter()" />
          <button class="btn-clear" (click)="clearDateFilter()">Clear</button>
        </div>
      </div>

      <button class="btn-configure" (click)="showConfig = !showConfig">
        {{ showConfig ? 'Done' : 'Configure Widgets' }}
      </button>

      @if (showConfig) {
        <div class="widget-config card">
          <h3>Toggle Widgets</h3>
          <div class="config-options">
            <label><input type="checkbox" [checked]="widgets()['kpis']" (change)="toggleWidget('kpis')" /> KPI Cards</label>
            <label><input type="checkbox" [checked]="widgets()['orderChart']" (change)="toggleWidget('orderChart')" /> Orders by Status</label>
            <label><input type="checkbox" [checked]="widgets()['productChart']" (change)="toggleWidget('productChart')" /> Top Products</label>
            <label><input type="checkbox" [checked]="widgets()['revenueChart']" (change)="toggleWidget('revenueChart')" /> Revenue Trend</label>
            <label><input type="checkbox" [checked]="widgets()['segmentation']" (change)="toggleWidget('segmentation')" /> Customer Segmentation</label>
            <label><input type="checkbox" [checked]="widgets()['quickLinks']" (change)="toggleWidget('quickLinks')" /> Quick Links</label>
          </div>
        </div>
      }

      @if (data(); as d) {
        @if (widgets()['kpis']) {
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-icon">📦</div>
              <div class="kpi-value">{{ d.totalProducts }}</div>
              <div class="kpi-label">Products</div>
            </div>
            <div class="kpi-card" [class.warning]="d.lowStockProducts > 0">
              <div class="kpi-icon">⚠️</div>
              <div class="kpi-value">{{ d.lowStockProducts }}</div>
              <div class="kpi-label">Low Stock</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">🛒</div>
              <div class="kpi-value">{{ d.totalOrders }}</div>
              <div class="kpi-label">Total Orders</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">⏳</div>
              <div class="kpi-value">{{ d.pendingOrders }}</div>
              <div class="kpi-label">Pending</div>
            </div>
            <div class="kpi-card highlight">
              <div class="kpi-icon">💰</div>
              <div class="kpi-value">\${{ d.totalRevenue | number: '1.2-2' }}</div>
              <div class="kpi-label">Revenue</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">⭐</div>
              <div class="kpi-value">{{ d.avgRating | number: '1.1-1' }}</div>
              <div class="kpi-label">Avg Rating ({{ d.totalReviews }} reviews)</div>
            </div>
          </div>
        }

        <div class="charts-row">
          @if (widgets()['orderChart']) {
            <div class="chart-card card">
              <h3>Orders by Status</h3>
              <canvas #orderChart></canvas>
            </div>
          }
          @if (widgets()['productChart']) {
            <div class="chart-card card">
              <h3>Top Products by Revenue</h3>
              <canvas #productChart></canvas>
            </div>
          }
        </div>

        @if (widgets()['revenueChart'] && d.revenueByMonth && hasMonthlyData(d)) {
          <div class="chart-wide card">
            <h3>Monthly Revenue Trend</h3>
            <p class="drill-hint">Click a month to drill down</p>
            <canvas #revenueChart></canvas>
          </div>
        }

        @if (drillMonth) {
          <div class="drilldown card">
            <div class="drilldown-header">
              <h3>Revenue Drill-Down: {{ drillMonth }}</h3>
              <button class="btn-clear" (click)="drillMonth = ''">Close</button>
            </div>
            <table>
              <thead><tr><th>Product</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>
                @for (p of d.topProducts; track p.productName) {
                  <tr>
                    <td>{{ p.productName }}</td>
                    <td>{{ p.orderCount }}</td>
                    <td>\${{ p.revenue | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

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
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
      }
      .page-header p {
        color: #64748b;
        font-size: 14px;
        margin-top: 4px;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 14px;
        margin-bottom: 28px;
      }
      .kpi-card {
        background: white;
        border-radius: 12px;
        padding: 18px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        transition: transform 0.15s;
      }
      .kpi-card:hover {
        transform: translateY(-2px);
      }
      .kpi-card.warning {
        border: 2px solid #f59e0b;
      }
      .kpi-card.highlight {
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
        color: white;
      }
      .kpi-card.highlight .kpi-label {
        color: rgba(255, 255, 255, 0.8);
      }
      .kpi-icon {
        font-size: 24px;
        margin-bottom: 6px;
      }
      .kpi-value {
        font-size: 24px;
        font-weight: 700;
      }
      .kpi-label {
        font-size: 11px;
        color: #64748b;
        margin-top: 4px;
        font-weight: 500;
        text-transform: uppercase;
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
      .chart-wide h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #374151;
      }
      .chart-card {
        padding: 20px;
      }
      .chart-card h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #374151;
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
        color: #374151;
        font-weight: 600;
        transition: all 0.15s;
      }
      .quick-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .quick-icon {
        font-size: 24px;
      }
      .date-filter {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
      }
      .date-filter label {
        font-size: 13px;
        color: #64748b;
        font-weight: 500;
      }
      .date-filter input {
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
      }
      .btn-clear {
        padding: 6px 14px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        font-size: 13px;
        cursor: pointer;
      }
      .btn-clear:hover {
        background: #f3f4f6;
      }
      .segmentation-section {
        padding: 20px;
        margin-bottom: 20px;
      }
      .segmentation-section h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #374151;
      }
      .seg-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .seg-card {
        background: #f8fafc;
        border-radius: 8px;
        padding: 14px;
        text-align: center;
      }
      .seg-value {
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
      }
      .seg-label {
        font-size: 11px;
        color: #64748b;
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
        color: #475569;
      }
      .seg-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .seg-table th {
        text-align: left;
        padding: 6px 8px;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
      }
      .seg-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #f1f5f9;
      }
      .badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-gold {
        background: #fef3c7;
        color: #92400e;
      }
      .badge-silver {
        background: #f1f5f9;
        color: #475569;
      }
      .badge-bronze {
        background: #fed7aa;
        color: #9a3412;
      }
      .drill-hint {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 8px;
      }
      .drilldown {
        padding: 20px;
        margin-bottom: 20px;
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
        color: #374151;
      }
      .drilldown table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .drilldown th {
        text-align: left;
        padding: 8px;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
      }
      .drilldown td {
        padding: 8px;
        border-bottom: 1px solid #f1f5f9;
      }
      .btn-configure {
        margin-bottom: 16px;
        padding: 6px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
        color: #374151;
      }
      .btn-configure:hover {
        background: #f3f4f6;
      }
      .widget-config {
        padding: 16px;
        margin-bottom: 20px;
      }
      .widget-config h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
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
      }
      .loading {
        text-align: center;
        padding: 60px;
        color: #64748b;
      }
      @media (max-width: 768px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .charts-row {
          grid-template-columns: 1fr;
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
  drillMonth = '';
  startDate = '';
  endDate = '';
  private orderChart: Chart | null = null;
  private productChart: Chart | null = null;
  private revenueChart: Chart | null = null;
  @ViewChild('orderChart') orderChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productChart') productChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;

  constructor(private dashboardService: DashboardService) {
    const saved = localStorage.getItem('corporate_widgets');
    if (saved) this.widgets.set(JSON.parse(saved));
  }

  toggleWidget(key: string) {
    const current = this.widgets();
    const updated = { ...current, [key]: !current[key] };
    this.widgets.set(updated);
    localStorage.setItem('corporate_widgets', JSON.stringify(updated));
    if (this.data()) setTimeout(() => this.renderCharts(this.data()!), 0);
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
        setTimeout(() => this.renderCharts(d), 0);
      });
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

  private renderCharts(d: CorporateDashboard) {
    if (this.orderChart) this.orderChart.destroy();
    if (this.productChart) this.productChart.destroy();
    if (this.revenueChart) this.revenueChart.destroy();
    const colors = ['#4361ee', '#f72585', '#4cc9f0', '#fca311', '#7209b7'];
    const statusLabels = Object.keys(d.ordersByStatus);
    this.orderChart = new Chart(this.orderChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{ data: statusLabels.map((k) => d.ordersByStatus[k]), backgroundColor: colors }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });

    this.productChart = new Chart(this.productChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: d.topProducts.map((p) => p.productName),
        datasets: [
          {
            label: 'Revenue ($)',
            data: d.topProducts.map((p) => p.revenue),
            backgroundColor: '#7c3aed',
          },
        ],
      },
      options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } },
    });

    // Revenue trend line chart
    if (this.revenueChartRef && d.revenueByMonth && Object.keys(d.revenueByMonth).length > 0) {
      const months = Object.keys(d.revenueByMonth).sort();
      this.revenueChart = new Chart(this.revenueChartRef.nativeElement, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Revenue ($)',
              data: months.map((m) => d.revenueByMonth[m]),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          onClick: (_event: any, elements: any[]) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              this.drillMonth = months[idx];
            }
          },
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
  }
}
