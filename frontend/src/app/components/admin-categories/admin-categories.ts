/**
 * Admin Categories — pixel-parity replica of Flower Prototype.html §AdmCategories.
 *
 * Inventory (verbatim):
 *   Root: padding 12px 32px 40px.
 *   Toolbar row (flex, gap 10, mb 16):
 *     spacer · [btn-primary  <Icon plus/> New category]
 *   Card (padding 14) contains a tree:
 *     Root row: flex align-center, gap 10, padding 10/12, radius 8,
 *               bg var(--hover). Shows <Icon tag size=14/> <b>{name}</b>
 *               · {count} products  · spacer ·
 *               [btn-ghost btn-sm <Icon edit/>]
 *               [btn-ghost btn-sm <Icon plus/> Add child]
 *     Child row: marginLeft 26, padding 8/12, flex align-center gap 10,
 *                border-bottom 1px var(--border). Shows
 *                <Icon chevron_right size=12/> <div font-size:13>{name}</div>
 *                · {count} products · spacer ·
 *                [btn-ghost btn-sm <Icon edit/>]
 *                [btn-ghost btn-sm btn-danger <Icon trash/>]
 *
 * Adaptations:
 *   - Editing / new-category opens a flower-dialog that reuses the
 *     existing CategoryService.create / update endpoints.
 *   - Category.productCount is not on the existing Category model,
 *     so the "· X products" note is omitted when the count is not
 *     available, keeping layout intact.
 */
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { FlowerDialogComponent } from '../../shared/flower-dialog/flower-dialog';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule, FlowerIconComponent, FlowerDialogComponent],
  template: `
    <div class="page">
      <!-- Toolbar row ————————————————————————————————— -->
      <div class="toolbar">
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn btn-primary" (click)="openNew()">
          <flower-icon name="plus" [size]="13" />
          New category
        </button>
      </div>

      <!-- Tree card ——————————————————————————————— -->
      <div class="card tree-card">
        @for (root of tree(); track root.id) {
          <div class="tree-block">
            <div class="tree-row root-row">
              <flower-icon name="tag" [size]="14" />
              <b class="root-name">{{ root.name }}</b>
              @if (productCountOf(root); as n) {
                <span class="count-note">· {{ n }} products</span>
              }
              <div class="row-spacer"></div>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                (click)="openEdit(root)"
                aria-label="Edit category"
              >
                <flower-icon name="edit" [size]="12" />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                (click)="openChild(root)"
              >
                <flower-icon name="plus" [size]="12" />
                Add child
              </button>
            </div>

            @for (child of root.children || []; track child.id) {
              <div class="tree-row child-row">
                <flower-icon name="chevron_right" [size]="12" />
                <div class="child-name">{{ child.name }}</div>
                @if (productCountOf(child); as n) {
                  <span class="count-note">· {{ n }} products</span>
                }
                <div class="row-spacer"></div>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  (click)="openEdit(child)"
                  aria-label="Edit category"
                >
                  <flower-icon name="edit" [size]="12" />
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-danger"
                  (click)="remove(child.id)"
                  aria-label="Delete category"
                >
                  <flower-icon name="trash" [size]="12" />
                </button>
              </div>
            }
          </div>
        }
        @if (tree().length === 0) {
          <div class="tree-empty">No categories yet.</div>
        }
      </div>

      <!-- Edit dialog ——————————————————————————————— -->
      @if (dialogOpen()) {
        <flower-dialog
          [title]="editId() ? 'Edit category' : 'New category'"
          [width]="440"
          (closed)="closeDialog()"
        >
          <div class="dlg-form">
            <div class="field">
              <label class="label">Name</label>
              <input
                class="input"
                [(ngModel)]="formName"
                [ngModelOptions]="{ standalone: true }"
                placeholder="e.g. Accessories"
              />
            </div>
            <div class="field">
              <label class="label">Parent</label>
              <select
                class="select"
                [(ngModel)]="formParentId"
                [ngModelOptions]="{ standalone: true }"
              >
                <option [ngValue]="null">None (root category)</option>
                @for (c of allCategories(); track c.id) {
                  <option [ngValue]="c.id">
                    {{ c.parentName ? c.parentName + ' > ' : '' }}{{ c.name }}
                  </option>
                }
              </select>
            </div>
          </div>
          <div footer>
            <button type="button" class="btn" (click)="closeDialog()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!formName.trim()"
              (click)="save()"
            >
              Save
            </button>
          </div>
        </flower-dialog>
      }
    </div>
  `,
  styleUrls: ['./admin-categories.scss'],
})
export class AdminCategoriesComponent implements OnInit {
  tree = signal<Category[]>([]);
  allCategories = signal<Category[]>([]);
  editId = signal<number | null>(null);
  dialogOpen = signal(false);
  formName = '';
  formParentId: number | null = null;

  constructor(private categoryService: CategoryService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.categoryService.getTree().subscribe((t) => this.tree.set(t));
    this.categoryService.getAll().subscribe((a) => this.allCategories.set(a));
  }

  productCountOf(c: Category): number | null {
    const n = (c as Category & { productCount?: number }).productCount;
    return typeof n === 'number' ? n : null;
  }

  openNew() {
    this.editId.set(null);
    this.formName = '';
    this.formParentId = null;
    this.dialogOpen.set(true);
  }

  openEdit(c: Category) {
    this.editId.set(c.id);
    this.formName = c.name;
    this.formParentId = c.parentId;
    this.dialogOpen.set(true);
  }

  openChild(parent: Category) {
    this.editId.set(null);
    this.formName = '';
    this.formParentId = parent.id;
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
  }

  save() {
    if (!this.formName.trim()) return;
    const data = { name: this.formName.trim(), parentId: this.formParentId ?? undefined };
    const obs = this.editId()
      ? this.categoryService.update(this.editId()!, data)
      : this.categoryService.create(data);
    obs.subscribe(() => {
      this.closeDialog();
      this.load();
    });
  }

  remove(id: number) {
    if (confirm('Delete this category?')) {
      this.categoryService.delete(id).subscribe(() => this.load());
    }
  }
}
