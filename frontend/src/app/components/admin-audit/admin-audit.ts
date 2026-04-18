/**
 * Admin Audit Logs — pixel-parity replica of Flower Prototype.html §AdmAudit.
 *
 * Inventory (verbatim):
 *   Root: padding 12px 32px 40px.
 *   Filter row: flex gap 10, mb 16, wrap — one btn-sm per distinct
 *     action prefixed by "ALL". Active filter uses btn-sm btn-dark.
 *   Card (padding 0) table:
 *     Columns: Time · Actor · Action · Entity · Details · IP
 *     Time:   mono 12
 *     Action: badge badge-muted (mono)
 *     Details: text-2
 *     IP:     mono 11.5 text-3
 *
 * Adaptations:
 *   - Backend's AuditLog DTO has no IP field. We drop the IP column
 *     (no element > empty data per the project rule).
 *   - "Actor" uses userEmail (falls back to "System" when missing).
 *   - Entity rendered as "{entityType} #{entityId}" where entityId > 0,
 *     else just entityType.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AuditLog } from '../../models/product.model';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page">
      <!-- Action filter chips ——————————————————————— -->
      <div class="filter-row">
        @for (a of actionFilters(); track a) {
          <button
            type="button"
            class="btn btn-sm"
            [class.btn-dark]="filter() === a"
            (click)="filter.set(a)"
          >
            {{ a }}
          </button>
        }
      </div>

      <!-- Log table card ——————————————————————————— -->
      <div class="card audit-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              @for (a of visible(); track a.id) {
                <tr>
                  <td class="c-time">
                    {{ a.timestamp | date: 'yyyy-MM-dd HH:mm:ss' }}
                  </td>
                  <td class="c-actor">{{ a.userEmail || 'System' }}</td>
                  <td>
                    <span class="badge badge-muted mono">{{ a.action }}</span>
                  </td>
                  <td class="c-entity">{{ entityLabel(a) }}</td>
                  <td class="c-details">{{ a.details || '—' }}</td>
                </tr>
              }
              @if (visible().length === 0) {
                <tr>
                  <td colspan="5" class="c-empty">No audit events match this filter.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./admin-audit.scss'],
})
export class AdminAuditComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  filter = signal<string>('ALL');

  actionFilters = computed<string[]>(() => {
    const unique = new Set<string>();
    for (const l of this.logs()) if (l.action) unique.add(l.action);
    return ['ALL', ...Array.from(unique).sort()];
  });

  visible = computed(() => {
    const f = this.filter();
    const all = this.logs();
    return f === 'ALL' ? all : all.filter((l) => l.action === f);
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.getAuditLogs().subscribe((l) => this.logs.set(l));
  }

  entityLabel(a: AuditLog): string {
    if (!a.entityType) return '—';
    if (!a.entityId || a.entityId <= 0) return a.entityType;
    return `${a.entityType} #${a.entityId}`;
  }
}
