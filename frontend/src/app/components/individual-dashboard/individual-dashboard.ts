import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { IndividualDashboard } from '../../models/product.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-individual-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="page">
      <div class="welcome">
        <div class="welcome-copy">
          <h2>Welcome back{{ firstName() ? ', ' + firstName() : '' }} 👋</h2>
          <p>Here's a snapshot of your purchases and activity.</p>
        </div>
        <button class="btn-configure" type="button" (click)="showConfig = !showConfig">
          {{ showConfig ? 'Done' : 'Configure Widgets' }}
        </button>
      </div>

      @if (showConfig) {
        <div class="widget-config card">
          <h3>Toggle Widgets</h3>
          <div class="config-options">
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['kpis']"
                (change)="toggleWidget('kpis')"
              />
              KPI Cards
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['orderChart']"
                (change)="toggleWidget('orderChart')"
              />
              Orders by Status
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['categoryChart']"
                (change)="toggleWidget('categoryChart')"
              />
              Spending by Category
            </label>
            <label>
              <input
                type="checkbox"
                [checked]="widgets()['quickLinks']"
                (change)="toggleWidget('quickLinks')"
              />
              Quick Links
            </label>
          </div>
        </div>
      }

      @if (data(); as d) {
        @if (widgets()['kpis']) {
          <div class="kpi-grid">
            <div class="kpi-card kpi-brand">
              <div class="kpi-head">
                <span class="kpi-icon" aria-hidden="true">💳</span>
              </div>
              <div class="kpi-value">\${{ d.totalSpend | number: '1.2-2' }}</div>
              <div class="kpi-label">Total Spend</div>
              <div class="kpi-sub">Lifetime across all orders</div>
            </div>

            <div class="kpi-card kpi-info">
              <div class="kpi-head">
                <span class="kpi-icon" aria-hidden="true">🛒</span>
              </div>
              <div class="kpi-value">{{ d.totalOrders }}</div>
              <div class="kpi-label">Orders</div>
              <div class="kpi-sub">{{ d.totalItemsPurchased }} items purchased</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-icon" aria-hidden="true">📊</span>
              </div>
              <div class="kpi-value">\${{ d.avgOrderValue | number: '1.2-2' }}</div>
              <div class="kpi-label">Avg Order Value</div>
              <div class="kpi-sub">Per order across history</div>
            </div>

            <div class="kpi-card kpi-warn">
              <div class="kpi-head">
                <span class="kpi-icon" aria-hidden="true">🏅</span>
              </div>
              <div class="kpi-value">{{ d.membershipType }}</div>
              <div class="kpi-label">Membership</div>
              <div class="kpi-sub">{{ d.totalReviews }} reviews written</div>
            </div>
          </div>
        }

        <div class="charts-row">
          @if (widgets()['orderChart']) {
            <div class="chart-card">
              <div class="chart-title">Orders by Status</div>
              <div class="chart-sub">Lifetime breakdown</div>
              <div class="chart-wrap"><canvas #orderChart></canvas></div>
            </div>
          }
          @if (widgets()['categoryChart']) {
            <div class="chart-card">
              <div class="chart-title">Spending by Category</div>
              <div class="chart-sub">Where your dollars go</div>
              <div class="chart-wrap"><canvas #categoryChart></canvas></div>
            </div>
          }
        </div>

        @if (widgets()['quickLinks']) {
          <div class="quick-links">
            <a routerLink="/products" class="quick-card">
              <span class="quick-icon" aria-hidden="true">🛍️</span>
              <span>Browse Products</span>
            </a>
            <a routerLink="/orders" class="quick-card">
              <span class="quick-icon" aria-hidden="true">📦</span>
              <span>My Orders</span>
            </a>
            <a routerLink="/reviews" class="quick-card">
              <span class="quick-icon" aria-hidden="true">⭐</span>
              <span>My Reviews</span>
            </a>
          </div>
        }
      } @else {
        <div class="loading">Loading dashboard…</div>
      }
    </div>
  `,
  styleUrls: ['./individual-dashboard.scss'],
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
  firstName = signal<string>('');

  @ViewChild('orderChart') orderChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];

  constructor(private dashboardService: DashboardService) {
    const saved = localStorage.getItem('individual_widgets');
    if (saved) {
      try {
        this.widgets.set(JSON.parse(saved));
      } catch {
        /* ignore corrupt storage */
      }
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        this.firstName.set(user.firstName || '');
      } catch {
        /* ignore */
      }
    }
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

    // DS §1.9 chart palette
    const donutPalette = ['#034f46', '#16a34a', '#ffa946', '#dfe9e5', '#7f1c34'];
    const axisColor = '#8a8a7c'; // --text-3
    const gridColor = '#d5d5c0'; // --border

    if (this.orderChartRef) {
      const statusLabels = Object.keys(d.ordersByStatus);
      this.charts.push(
        new Chart(this.orderChartRef.nativeElement, {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [
              {
                data: statusLabels.map((k) => d.ordersByStatus[k]),
                backgroundColor: statusLabels.map(
                  (_, i) => donutPalette[i % donutPalette.length],
                ),
                borderColor: '#faf8ea',
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: axisColor, font: { size: 11 }, boxWidth: 10 },
              },
            },
          },
        }),
      );
    }

    if (this.categoryChartRef) {
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
                backgroundColor: '#034f46',
                borderRadius: 6,
                barThickness: 22,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                ticks: { color: axisColor, font: { size: 11 } },
                grid: { display: false },
              },
              y: {
                beginAtZero: true,
                ticks: { color: axisColor, font: { size: 11 } },
                grid: { color: gridColor, tickBorderDash: [2, 2] },
              },
            },
          },
        }),
      );
    }
  }
}
