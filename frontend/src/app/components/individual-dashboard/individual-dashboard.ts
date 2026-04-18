import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { IndividualDashboard } from '../../models/product.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-individual-dashboard',
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>My Dashboard</h1>
        <p>Personal spending analytics</p>
        <button class="btn-configure" (click)="showConfig = !showConfig">
          {{ showConfig ? 'Done' : 'Configure Widgets' }}
        </button>
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
                [checked]="widgets()['categoryChart']"
                (change)="toggleWidget('categoryChart')"
              />
              Spending by Category</label
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
            <div class="kpi-card highlight">
              <div class="kpi-icon">💳</div>
              <div class="kpi-value">\${{ d.totalSpend | number: '1.2-2' }}</div>
              <div class="kpi-label">Total Spend</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">🛒</div>
              <div class="kpi-value">{{ d.totalOrders }}</div>
              <div class="kpi-label">Orders</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">📦</div>
              <div class="kpi-value">{{ d.totalItemsPurchased }}</div>
              <div class="kpi-label">Items Purchased</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">📊</div>
              <div class="kpi-value">\${{ d.avgOrderValue | number: '1.2-2' }}</div>
              <div class="kpi-label">Avg Order Value</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-icon">⭐</div>
              <div class="kpi-value">{{ d.totalReviews }}</div>
              <div class="kpi-label">Reviews Written</div>
            </div>
            <div class="kpi-card membership">
              <div class="kpi-icon">🏅</div>
              <div class="kpi-value">{{ d.membershipType }}</div>
              <div class="kpi-label">Membership</div>
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
          @if (widgets()['categoryChart']) {
            <div class="chart-card card">
              <h3>Spending by Category</h3>
              <canvas #categoryChart></canvas>
            </div>
          }
        </div>

        @if (widgets()['quickLinks']) {
          <div class="quick-links">
            <a routerLink="/products" class="quick-card card">
              <span class="quick-icon">🛍️</span>
              <span>Browse Products</span>
            </a>
            <a routerLink="/orders" class="quick-card card">
              <span class="quick-icon">📋</span>
              <span>My Orders</span>
            </a>
            <a routerLink="/reviews" class="quick-card card">
              <span class="quick-icon">⭐</span>
              <span>My Reviews</span>
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
        color: #1a1a1a;
      }
      .page-header p {
        color: #666;
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
        background: #ffffeb;
        border-radius: 16px;
        padding: 18px;
        text-align: center;
        border: 1px solid #d5d5c0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        transition: transform 0.15s;
      }
      .kpi-card:hover {
        transform: translateY(-2px);
      }
      .kpi-card.highlight {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        border: none;
      }
      .kpi-card.highlight .kpi-label {
        color: rgba(255, 255, 255, 0.8);
      }
      .kpi-card.highlight .kpi-value {
        color: white;
      }
      .kpi-card.membership {
        border: 2px solid #d97706;
      }
      .kpi-icon {
        font-size: 24px;
        margin-bottom: 6px;
      }
      .kpi-value {
        font-size: 22px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .kpi-label {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        font-weight: 500;
        text-transform: uppercase;
      }
      .charts-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
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
        color: #1a1a1a;
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
      .btn-configure {
        margin-top: 10px;
        padding: 6px 16px;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        background: #ffffeb;
        font-size: 13px;
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
      }
    `,
  ],
})
export class IndividualDashboardComponent implements OnInit, OnDestroy {
  data = signal<IndividualDashboard | null>(null);
  widgets = signal<Record<string, boolean>>({
    kpis: true,
    orderChart: true,
    categoryChart: true,
    quickLinks: true,
  });
  showConfig = false;
  @ViewChild('orderChart') orderChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];

  constructor(private dashboardService: DashboardService) {
    const saved = localStorage.getItem('individual_widgets');
    if (saved) this.widgets.set(JSON.parse(saved));
  }

  toggleWidget(key: string) {
    const current = this.widgets();
    const updated = { ...current, [key]: !current[key] };
    this.widgets.set(updated);
    localStorage.setItem('individual_widgets', JSON.stringify(updated));
    if (this.data()) setTimeout(() => this.renderCharts(this.data()!), 0);
  }

  ngOnInit() {
    this.dashboardService.getIndividualDashboard().subscribe((d) => {
      this.data.set(d);
      setTimeout(() => this.renderCharts(d), 0);
    });
  }

  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderCharts(d: IndividualDashboard) {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    const colors = ['#8b7cf6', '#f472b6', '#06b6d4', '#f59e0b', '#a78bfa', '#10b981'];
    const chartTextColor = '#6b7280';
    const gridColor = '#ebe6dc';
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
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: chartTextColor } } },
        },
      }),
    );

    const catLabels = Object.keys(d.spendByCategory);
    this.charts.push(
      new Chart(this.categoryChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: catLabels,
          datasets: [
            {
              label: 'Spend ($)',
              data: catLabels.map((k) => d.spendByCategory[k]),
              backgroundColor: '#10b981',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: chartTextColor }, grid: { color: gridColor } },
            y: { beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: gridColor } },
          },
        },
      }),
    );
  }
}
