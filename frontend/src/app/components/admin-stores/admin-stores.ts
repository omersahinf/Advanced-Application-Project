import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { Store } from '../../models/product.model';

type StatusFilter = 'ALL' | 'PENDING_APPROVAL' | 'ACTIVE' | 'CLOSED';

@Component({
  selector: 'app-admin-stores',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="tabs">
        @for (t of tabs; track t.key) {
          <button class="tab" [class.active]="filter() === t.key" (click)="filter.set(t.key)">
            {{ t.label }}
            <span class="count">{{ countFor(t.key) }}</span>
          </button>
        }
      </div>

      <div class="store-grid">
        @for (s of filteredStores(); track s.id) {
          <div class="store-card card">
            <div class="store-header">
              <h3>{{ s.name }}</h3>
              <span class="status-badge" [class]="'status-' + s.status.toLowerCase()">{{
                s.status
              }}</span>
            </div>
            <p class="store-desc">{{ s.description || 'No description' }}</p>
            <div class="store-meta">
              <span>Owner: {{ s.ownerName }}</span>
              <span>Products: {{ s.productCount }}</span>
              <span>Created: {{ s.createdAt | date: 'mediumDate' }}</span>
            </div>
            <div class="store-actions">
              @if (s.status === 'PENDING_APPROVAL') {
                <button class="btn-sm success" (click)="updateStatus(s.id, 'ACTIVE')">
                  Approve
                </button>
                <button class="btn-sm danger" (click)="updateStatus(s.id, 'CLOSED')">Reject</button>
              } @else if (s.status === 'ACTIVE') {
                <button class="btn-sm warning" (click)="updateStatus(s.id, 'CLOSED')">
                  Close Store
                </button>
              } @else {
                <button class="btn-sm success" (click)="updateStatus(s.id, 'ACTIVE')">
                  Activate Store
                </button>
              }
            </div>
          </div>
        }
      </div>

      @if (filteredStores().length === 0) {
        <div class="empty card">No stores match this filter</div>
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
        margin-bottom: 16px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .subtitle {
        color: #666;
        font-size: 13px;
        margin-top: 4px;
      }
      .tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 8px;
        flex-wrap: wrap;
      }
      .tab {
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 600;
        color: #555;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
      }
      .tab:hover {
        background: #f3f4f6;
      }
      .tab.active {
        background: #1a1a1a;
        color: #fff;
        border-color: #1a1a1a;
      }
      .tab .count {
        background: rgba(255, 255, 255, 0.25);
        color: inherit;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: 11px;
      }
      .tab:not(.active) .count {
        background: #e5e7eb;
        color: #555;
      }
      .store-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 16px;
      }
      .store-card {
        padding: 20px;
      }
      .store-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .store-header h3 {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
        text-transform: uppercase;
      }
      .status-active {
        background: #dcfce7;
        color: #16a34a;
      }
      .status-closed {
        background: #fee2e2;
        color: #dc2626;
      }
      .status-pending_approval {
        background: #fef3c7;
        color: #d97706;
      }
      .store-desc {
        color: #666;
        font-size: 13px;
        margin-bottom: 12px;
      }
      .store-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: #999;
        margin-bottom: 16px;
      }
      .store-actions {
        display: flex;
        gap: 8px;
      }
      .btn-sm {
        padding: 6px 14px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.15s;
      }
      .btn-sm.warning {
        background: #fef3c7;
        color: #d97706;
      }
      .btn-sm.warning:hover {
        background: #fde68a;
      }
      .btn-sm.success {
        background: #dcfce7;
        color: #16a34a;
      }
      .btn-sm.success:hover {
        background: #bbf7d0;
      }
      .btn-sm.danger {
        background: #fee2e2;
        color: #dc2626;
      }
      .btn-sm.danger:hover {
        background: #fecaca;
      }
      .empty {
        padding: 40px;
        text-align: center;
        color: #666;
      }
    `,
  ],
})
export class AdminStoresComponent implements OnInit {
  stores = signal<Store[]>([]);
  filter = signal<StatusFilter>('ALL');

  tabs: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  filteredStores = computed(() => {
    const f = this.filter();
    const all = this.stores();
    return f === 'ALL' ? all : all.filter((s) => s.status === f);
  });

  constructor(private storeService: StoreService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.storeService.getAllStores().subscribe((s) => this.stores.set(s));
  }

  countFor(key: StatusFilter): number {
    const all = this.stores();
    return key === 'ALL' ? all.length : all.filter((s) => s.status === key).length;
  }

  updateStatus(id: number, status: string) {
    this.storeService.updateStoreStatus(id, status).subscribe(() => this.load());
  }
}
