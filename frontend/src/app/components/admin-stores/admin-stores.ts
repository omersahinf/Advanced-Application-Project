import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { Store } from '../../models/product.model';

@Component({
  selector: 'app-admin-stores',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Store Management</h1>
      </div>

      <div class="store-grid">
        @for (s of stores(); track s.id) {
          <div class="store-card card">
            <div class="store-header">
              <h3>{{ s.name }}</h3>
              <span class="status-badge" [class]="'status-' + s.status.toLowerCase()">{{ s.status }}</span>
            </div>
            <p class="store-desc">{{ s.description || 'No description' }}</p>
            <div class="store-meta">
              <span>Owner: {{ s.ownerName }}</span>
              <span>Products: {{ s.productCount }}</span>
              <span>Created: {{ s.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="store-actions">
              @if (s.status === 'ACTIVE') {
                <button class="btn-sm warning" (click)="updateStatus(s.id, 'CLOSED')">Close Store</button>
              } @else {
                <button class="btn-sm success" (click)="updateStatus(s.id, 'ACTIVE')">Activate Store</button>
              }
            </div>
          </div>
        }
      </div>

      @if (stores().length === 0) {
        <div class="empty card">No stores found</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; }
    .store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px; }
    .store-card { padding: 20px; }
    .store-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .store-header h3 { font-size: 18px; font-weight: 700; }
    .status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; }
    .status-active { background: #dcfce7; color: #16a34a; }
    .status-closed { background: #fee2e2; color: #dc2626; }
    .status-pending_approval { background: #fef3c7; color: #d97706; }
    .store-desc { color: #64748b; font-size: 13px; margin-bottom: 12px; }
    .store-meta { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #9ca3af; margin-bottom: 16px; }
    .store-actions { display: flex; gap: 8px; }
    .btn-sm { padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.15s; }
    .btn-sm.warning { background: #fef3c7; color: #d97706; }
    .btn-sm.warning:hover { background: #fde68a; }
    .btn-sm.success { background: #dcfce7; color: #16a34a; }
    .btn-sm.success:hover { background: #bbf7d0; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; }
  `]
})
export class AdminStoresComponent implements OnInit {
  stores = signal<Store[]>([]);

  constructor(private storeService: StoreService) {}

  ngOnInit() { this.load(); }

  load() {
    this.storeService.getAllStores().subscribe(s => this.stores.set(s));
  }

  updateStatus(id: number, status: string) {
    this.storeService.updateStoreStatus(id, status).subscribe(() => this.load());
  }
}
