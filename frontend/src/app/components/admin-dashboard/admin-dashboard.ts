import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AdminDashboard } from '../../models/product.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Platform Analytics</h1>
        <p>Admin Dashboard</p>
      </div>

      <button class="btn-configure" (click)="showConfig = !showConfig">
        {{ showConfig ? 'Done' : 'Configure Widgets' }}
      </button>

      @if (showConfig) {
        <div class="widget-config card">
          <h3>Toggle Widgets</h3>
          <div class="config-options">
            <label
              ><input type="checkbox" [checked]="widgets()['kpis']" (change)="toggleWidget('kpis')" />
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
                [checked]="widgets()['userChart']"
                (change)="toggleWidget('userChart')"
              />
              Users by Role</label
            >
            <label
              ><input
                type="checkbox"
                [checked]="widgets()['revenueChart']"
                (change)="toggleWidget('revenueChart')"
              />
              Revenue by Store</label
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
              <h3>Total Users</h3>
              <p class="kpi-value">{{ d.totalUsers | number }}</p>
            </div>
            <div class="kpi-card">
              <h3>Total Stores</h3>
              <p class="kpi-value">{{ d.totalStores | number }}</p>
            </div>
            <div class="kpi-card">
              <h3>Total Products</h3>
              <p class="kpi-value">{{ d.totalProducts | number }}</p>
            </div>
            <div class="kpi-card">
              <h3>Total Orders</h3>
              <p class="kpi-value">{{ d.totalOrders | number }}</p>
            </div>
            <div class="kpi-card">
              <h3>Total Revenue</h3>
              <p class="kpi-value">{{ d.totalRevenue | number:'1.2-2' }}</p>
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
          @if (widgets()['userChart']) {
            <div class="chart-card card">
              <h3>Users by Role</h3>
              <canvas #userChart></canvas>
            </div>
          }
          @if (widgets()['revenueChart']) {
            <div class="chart-card card">
              <h3>Revenue by Store</h3>
              <canvas #revenueChart></canvas>
            </div>
          }
        </div>

        @if (widgets()['quickLinks']) {
          <div class="quick-links">
            <a routerLink="/admin/users" class="quick-card card">
              <span class="quick-icon">👥</span>
              <span>Manage Users</span>
            </a>
            <a routerLink="/admin/stores" class="quick-card card">
              <span class="quick-icon">🏪</span>
              <span>Manage Stores</span>
            </a>
            <a routerLink="/admin/categories" class="quick-card card">
              <span class="quick-icon">📁</span>
              <span>Manage Categories</span>
            </a>
            <a routerLink="/admin/settings" class="quick-card card">
              <span class="quick-icon">⚙️</span>
              <span>System Settings</span>
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
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        margin-bottom: 28px;
      }
      .kpi-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        transition: transform 0.15s;
      }
      .kpi-card:hover {
        transform: translateY(-2px);
      }
      .kpi-card.highlight {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .kpi-card.highlight .kpi-label {
        color: rgba(255, 255, 255, 0.8);
      }
      .kpi-icon {
        font-size: 28px;
        margin-bottom: 8px;
      }
      .kpi-value {
        font-size: 28px;
        font-weight: 700;
      }
      .kpi-label {
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .charts-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 28px;
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
        grid-template-columns: repeat(4, 1fr);
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
        .quick-links {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  data = signal<AdminDashboard | null>(null);
  widgets = signal<Record<string, boolean>>({
    kpis: true,
    orderChart: true,
    userChart: true,
    revenueChart: true,
    quickLinks: true,
  });
  showConfig = false;

  @ViewChild('orderChart') orderChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('userChart') userChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private chartsReady = false;
  private charts: Chart[] = [];

  constructor(private dashboardService: DashboardService) {
    const saved = localStorage.getItem('admin_widgets');
    if (saved) this.widgets.set(JSON.parse(saved));
  }

  toggleWidget(key: string) {
    const current = this.widgets();
    const updated = { ...current, [key]: !current[key] };
    this.widgets.set(updated);
    localStorage.setItem('admin_widgets', JSON.stringify(updated));
    if (this.data()) setTimeout(() => this.renderCharts(this.data()!), 0);
  }

  ngOnInit() {
    this.dashboardService.getAdminDashboard().subscribe((d) => {
      this.data.set(d);
      setTimeout(() => this.renderCharts(d), 0);
    });
  }

  ngAfterViewInit() {
    this.chartsReady = true;
  }

  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderCharts(d: AdminDashboard) {
    if (!this.chartsReady) return;
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    const colors = ['#4361ee', '#f72585', '#4cc9f0', '#fca311', '#7209b7', '#2ec4b6'];

    // Orders by Status
    const statusLabels = Object.keys(d.ordersByStatus);
    this.charts.push(
      new Chart(this.orderChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [
            { data: statusLabels.map((k) => d.ordersByStatus[k]), backgroundColor: colors },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      }),
    );

    // Users by Role
    const roleLabels = Object.keys(d.usersByRole);
    this.charts.push(
      new Chart(this.userChartRef.nativeElement, {
        type: 'pie',
        data: {
          labels: roleLabels,
          datasets: [
            {
              data: roleLabels.map((k) => d.usersByRole[k]),
              backgroundColor: ['#e63946', '#4361ee', '#2ec4b6'],
            },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      }),
    );

    // Revenue by Store
    this.charts.push(
      new Chart(this.revenueChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: d.topStores.map((s) => s.storeName),
          datasets: [
            {
              label: 'Revenue ($)',
              data: d.topStores.map((s) => s.revenue),
              backgroundColor: '#4361ee',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      }),
    );
  }
}
