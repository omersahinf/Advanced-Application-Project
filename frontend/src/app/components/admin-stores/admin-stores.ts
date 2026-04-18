/**
 * Admin Stores — pixel-parity replica of Flower Prototype.html §AdmStores.
 *
 * Inventory (verbatim):
 *   Root: padding 12px 32px 40px.
 *   Grid: 2 columns, gap 16.
 *   Card: padding 20.
 *     Header row (flex, space-between):
 *       Left: 40x40 rounded gradient tile with <Icon store size=18/>
 *             + {name (serif, 16px, 700)} / {description (text-3, 12px)}
 *       Right: <StatusPill status={status}/>
 *     Stats row (3 cols, border-top + border-bottom, padding 12 0):
 *       <Stat k="Revenue" v={fmtUSD(revenue)}/>
 *       <Stat k="Orders"  v={orders}/>
 *       <Stat k="Rating"  v={<Stars n={rating} size={11}/> {rating}}/>
 *     Footer: Owner: <b>{owner}</b> · spacer · btn btn-sm
 *       "Close store" | "Reactivate"   (toggles ACTIVE <-> CLOSED).
 *
 *   Stat component: uppercase 10.5px text-3 label + 14px 600 value.
 *
 * Adaptations:
 *   - Store revenue / orders / rating come from
 *     AdminService.getStoreComparison(); description / owner / status
 *     come from StoreService.getAllStores(). Merged by storeId.
 *   - Backend also supports PENDING_APPROVAL. For those rows we
 *     render Approve / Reject buttons; otherwise we follow the
 *     prototype toggle exactly.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { StoreService } from '../../services/store.service';
import { AdminService } from '../../services/admin.service';
import { Store, StoreComparison } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { FlowerStarsComponent } from '../../shared/flower-stars/flower-stars';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { CommonModule } from '@angular/common';

interface StoreRow {
  id: number;
  name: string;
  description: string;
  status: string;
  ownerName: string;
  revenue: number;
  orders: number;
  rating: number;
  reviews: number;
}

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [CommonModule, FlowerIconComponent, FlowerStarsComponent, StatusPillComponent],
  template: `
    <div class="page">
      <div class="stores-grid">
        @for (s of rows(); track s.id) {
          <div class="card store-card">
            <div class="store-head">
              <div class="head-left">
                <div class="store-tile" aria-hidden="true">
                  <flower-icon name="store" [size]="18" />
                </div>
                <div class="head-text">
                  <div class="store-name">{{ s.name }}</div>
                  <div class="store-desc">{{ s.description || 'No description' }}</div>
                </div>
              </div>
              <status-pill [status]="s.status" />
            </div>

            <div class="stats-row">
              <div class="stat">
                <div class="stat-k">Revenue</div>
                <div class="stat-v">\${{ s.revenue | number: '1.2-2' }}</div>
              </div>
              <div class="stat">
                <div class="stat-k">Orders</div>
                <div class="stat-v">{{ s.orders }}</div>
              </div>
              <div class="stat">
                <div class="stat-k">Rating</div>
                <div class="stat-v rating-v">
                  <flower-stars [value]="s.rating" [size]="11" />
                  <span>{{ s.rating ? (s.rating | number: '1.1-1') : '—' }}</span>
                </div>
              </div>
            </div>

            <div class="store-foot">
              <div class="owner">
                Owner: <b>{{ s.ownerName }}</b>
              </div>
              <div class="foot-spacer"></div>
              @if (s.status === 'PENDING_APPROVAL') {
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  (click)="updateStatus(s.id, 'ACTIVE')"
                >
                  Approve
                </button>
                <button type="button" class="btn btn-sm" (click)="updateStatus(s.id, 'CLOSED')">
                  Reject
                </button>
              } @else if (s.status === 'ACTIVE') {
                <button type="button" class="btn btn-sm" (click)="updateStatus(s.id, 'CLOSED')">
                  Close store
                </button>
              } @else {
                <button type="button" class="btn btn-sm" (click)="updateStatus(s.id, 'ACTIVE')">
                  Reactivate
                </button>
              }
            </div>
          </div>
        }
      </div>

      @if (rows().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">🏬</div>
          <div class="empty-title">No stores yet</div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./admin-stores.scss'],
})
export class AdminStoresComponent implements OnInit {
  private stores = signal<Store[]>([]);
  private comparison = signal<StoreComparison[]>([]);

  rows = computed<StoreRow[]>(() => {
    const byId = new Map<number, StoreComparison>();
    for (const c of this.comparison()) byId.set(c.storeId, c);
    return this.stores().map((s) => {
      const c = byId.get(s.id);
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        ownerName: s.ownerName,
        revenue: c?.totalRevenue ?? 0,
        orders: c?.totalOrders ?? 0,
        rating: c?.avgRating ?? 0,
        reviews: c?.totalReviews ?? 0,
      };
    });
  });

  constructor(
    private storeService: StoreService,
    private adminService: AdminService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.storeService.getAllStores().subscribe((s) => this.stores.set(s));
    this.adminService.getStoreComparison().subscribe((c) => this.comparison.set(c));
  }

  updateStatus(id: number, status: string) {
    this.storeService.updateStoreStatus(id, status).subscribe(() => this.load());
  }
}
