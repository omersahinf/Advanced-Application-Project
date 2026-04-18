/**
 * Admin Dashboard — pixel-parity replica of Flower Prototype.html §AdmDashboard.
 *
 * Inventory (verbatim from prototype):
 *   Root: padding "12px 32px 40px", flex column, gap 20.
 *
 *   Block 1 — KPI grid (4 cols, gap 16):
 *     KpiCard "GMV (MTD)"     value fmtUSD · sub "vs 81.2k last month"
 *                             accent #034f46 · icon chart · delta +14%
 *     KpiCard "Active stores" value 3      · sub "1 closed · 4 total"
 *                             accent #034f46 · icon store
 *     KpiCard "Users"         value 12     · sub "5 corporate · 7 individual"
 *                             accent #ffa946 · icon users · delta +2
 *     KpiCard "Flags today"   value 2      · sub "1 suspended · 1 pending"
 *                             accent #dc2626 · icon shield
 *
 *   Block 2 — Charts row (1.6fr / 1fr, gap 16):
 *     Left:  "Revenue by store" card (padding 20) — serif h2, legend
 *            chips (TechCorp #034f46, GreenMarket #dfe9e5, FashionHub
 *            #ffa946, HomeEssentials #d5d5c0) + StackedBarChart over
 *            6 months × 4 stores.
 *     Right: "Orders by status (all stores)" card (padding 20) — Donut.
 *
 *   Block 3 — Two-col row (1fr / 1fr, gap 16):
 *     Left:  "Store comparison" card (padding 0)
 *            header 14px 20px border-bottom — [View all] → /admin/stores
 *            table: Store (name + owner) · Status · Orders · Revenue (right)
 *     Right: "Recent audit events" card (padding 0)
 *            header 14px 20px — [Open logs] → /admin/audit
 *            list of last 5 events: 28px colored square (err-bg if FAIL/
 *            SUSPEND/CLOSE, else hover) with an icon picked from the
 *            action verb; action (bold) + entity (text-3), details
 *            underneath, mono time (HH:MM:SS) on the right.
 *
 * Data adaptations vs prototype (preserving layout, swapping data):
 *   - GMV (MTD):     totalRevenue (no MTD split in the API) — delta and
 *                    "vs last month" sub are omitted (no prior-period
 *                    data exposed).
 *   - Active stores: totalStores. Sub becomes "stores on platform".
 *   - Users:         totalUsers with "{corp} corporate · {ind} individual"
 *                    sub pulled from usersByRole.
 *   - Flags today:   Prototype shows suspensions + pending; the backend
 *                    has no flag counter yet. We render the same card
 *                    slot with value 0 and sub "no flags today" so the
 *                    visual grid parity is kept.
 *   - Revenue by store: the backend exposes totalRevenue aggregated by
 *                    store via AdminService.getStoreComparison. We use
 *                    that for a bar chart instead of a 6-month stack,
 *                    colouring bars with the prototype palette. Monthly
 *                    per-store stacks are not in the DTO.
 *   - Orders by status (all stores): AdminDashboard.ordersByStatus.
 *   - Store comparison: getStoreComparison() — same columns as prototype.
 *   - Recent audit events: getAuditLogs(), first 5 entries.
 */
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AdminService } from '../../services/admin.service';
import {
  AdminDashboard,
  AuditLog,
  StoreComparison,
} from '../../models/product.model';
import { Chart, registerables } from 'chart.js';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card';
import { FlowerIconComponent, FlowerIconName } from '../../shared/flower-icon/flower-icon';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';

Chart.register(...registerables);

/** Colour palette used by both the "Revenue by store" legend chips and the
 *  chart itself. Matches the prototype's StackedBarChart segment colours.
 */
const STORE_PALETTE = ['#034f46', '#dfe9e5', '#ffa946', '#d5d5c0'];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    KpiCardComponent,
    FlowerIconComponent,
    StatusPillComponent,
  ],
  template: `
    <div class="page">
      @if (data(); as d) {
        <!-- Block 1 — KPI grid ———————————————————————— -->
        <div class="kpi-grid">
          <kpi-card
            label="GMV (MTD)"
            [value]="'$' + (d.totalRevenue | number: '1.2-2')"
            [sub]="'across ' + d.totalOrders + ' orders'"
            accent="#034f46"
            icon="chart"
          />
          <kpi-card
            label="Active stores"
            [value]="d.totalStores"
            sub="stores on platform"
            accent="#034f46"
            icon="store"
          />
          <kpi-card
            label="Users"
            [value]="d.totalUsers"
            [sub]="usersSub()"
            accent="#ffa946"
            icon="users"
          />
          <kpi-card
            label="Flags today"
            [value]="flagsValue()"
            [sub]="flagsSub()"
            accent="#dc2626"
            icon="shield"
          />
        </div>

        <!-- Block 2 — Charts row ———————————————————————— -->
        <div class="charts-row">
          <div class="card chart-card">
            <h2 class="serif-h2">Revenue by store</h2>
            <div class="legend">
              @for (s of storeLegend(); track s.name) {
                <span class="legend-item">
                  <span class="legend-dot" [style.background]="s.color"></span>
                  {{ s.name }}
                </span>
              }
            </div>
            <div class="chart-wrap">
              <canvas #revenueChart></canvas>
            </div>
          </div>
          <div class="card chart-card">
            <h2 class="serif-h2">Orders by status (all stores)</h2>
            <div class="chart-wrap donut-wrap">
              <canvas #ordersChart></canvas>
            </div>
          </div>
        </div>

        <!-- Block 3 — Store comparison + audit ——————————— -->
        <div class="bottom-row">
          <div class="card tile-card">
            <div class="tile-head">
              <h2 class="serif-h2">Store comparison</h2>
              <a routerLink="/admin/stores" class="btn btn-sm">View all</a>
            </div>
            <table class="tile-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th class="right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                @for (s of storeComparison(); track s.storeId) {
                  <tr>
                    <td>
                      <b>{{ s.storeName }}</b>
                      <div class="store-owner">{{ s.ownerName }}</div>
                    </td>
                    <td><status-pill [status]="s.status" /></td>
                    <td>{{ s.totalOrders }}</td>
                    <td class="right bold">
                      \${{ s.totalRevenue | number: '1.2-2' }}
                    </td>
                  </tr>
                }
                @if (storeComparison().length === 0) {
                  <tr>
                    <td colspan="4" class="tile-empty">No stores yet.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="card tile-card">
            <div class="tile-head">
              <h2 class="serif-h2">Recent audit events</h2>
              <a routerLink="/admin/audit" class="btn btn-sm">Open logs</a>
            </div>
            <div class="audit-list">
              @for (a of recentAudits(); track a.id) {
                <div class="audit-row">
                  <div
                    class="audit-icon"
                    [class.danger]="isDangerAction(a.action)"
                  >
                    <flower-icon [name]="iconForAction(a.action)" [size]="14" />
                  </div>
                  <div class="audit-body">
                    <div>
                      <b>{{ a.action }}</b>
                      <span class="audit-entity"> · {{ a.entityType }}</span>
                    </div>
                    <div class="audit-details">{{ a.details }}</div>
                  </div>
                  <div class="audit-time">
                    {{ a.timestamp | date: 'HH:mm:ss' }}
                  </div>
                </div>
              }
              @if (recentAudits().length === 0) {
                <div class="tile-empty">No audit events yet.</div>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="loading">Loading dashboard…</div>
      }
    </div>
  `,
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  data = signal<AdminDashboard | null>(null);
  storeComparison = signal<StoreComparison[]>([]);
  recentAudits = signal<AuditLog[]>([]);

  storeLegend = computed(() =>
    this.storeComparison()
      .slice(0, 4)
      .map((s, i) => ({ name: s.storeName, color: STORE_PALETTE[i % STORE_PALETTE.length] })),
  );

  usersSub = computed(() => {
    const byRole = this.data()?.usersByRole ?? {};
    const corp = byRole['CORPORATE'] ?? 0;
    const ind = byRole['INDIVIDUAL'] ?? 0;
    return `${corp} corporate · ${ind} individual`;
  });

  flagsValue = computed(() => 0);
  flagsSub = computed(() => 'no flags today');

  @ViewChild('revenueChart') revenueChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef?: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  constructor(
    private dashboardService: DashboardService,
    private adminService: AdminService,
  ) {}

  ngOnInit() {
    this.dashboardService.getAdminDashboard().subscribe((d) => {
      this.data.set(d);
      this.tryRenderOrdersChart();
    });
    this.adminService.getStoreComparison().subscribe((s) => {
      this.storeComparison.set(s);
      this.tryRenderRevenueChart();
    });
    this.adminService.getAuditLogs().subscribe((a) => {
      this.recentAudits.set(a.slice(0, 5));
    });
  }

  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private tryRenderOrdersChart(attempt = 0) {
    if (attempt > 20) return;
    const canvas = this.ordersChartRef?.nativeElement;
    if (!canvas) {
      requestAnimationFrame(() => this.tryRenderOrdersChart(attempt + 1));
      return;
    }
    const d = this.data();
    if (!d) return;
    const labels = Object.keys(d.ordersByStatus);
    const values = labels.map((l) => d.ordersByStatus[l]);
    const colorByStatus: Record<string, string> = {
      PENDING: '#d97706',
      CONFIRMED: '#034f46',
      SHIPPED: '#1e3a8a',
      DELIVERED: '#16a34a',
      CANCELLED: '#dc2626',
    };
    this.charts.push(
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((l) => colorByStatus[l] ?? '#8a8a7c'),
              borderWidth: 0,
              spacing: 2,
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
              labels: { color: '#5a5a52', font: { size: 11 } },
            },
          },
        },
      }),
    );
  }

  private tryRenderRevenueChart(attempt = 0) {
    if (attempt > 20) return;
    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) {
      requestAnimationFrame(() => this.tryRenderRevenueChart(attempt + 1));
      return;
    }
    const list = this.storeComparison().slice(0, 4);
    this.charts.push(
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: list.map((s) => s.storeName),
          datasets: [
            {
              label: 'Revenue',
              data: list.map((s) => s.totalRevenue),
              backgroundColor: list.map((_, i) => STORE_PALETTE[i % STORE_PALETTE.length]),
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8a8a7c', font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#ebe6dc' },
              ticks: { color: '#8a8a7c', font: { size: 11 } },
            },
          },
        },
      }),
    );
  }

  isDangerAction(a: string): boolean {
    const up = a.toUpperCase();
    return up.includes('FAIL') || up.includes('SUSPEND') || up.includes('CLOSE') || up.includes('DELETE');
  }

  iconForAction(a: string): FlowerIconName {
    const up = a.toUpperCase();
    if (up.includes('LOGIN') || up.includes('AUTH')) return 'shield';
    if (up.includes('ORDER')) return 'package';
    if (up.includes('PRODUCT')) return 'tag';
    return 'edit';
  }
}
