import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/product.model';

@Component({
  selector: 'app-admin-categories',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Category Management</h1>
      </div>

      <div class="content-grid">
        <div class="form-card card">
          <h3>{{ editId() ? 'Edit Category' : 'Add Category' }}</h3>
          <form (ngSubmit)="save()">
            <div class="field">
              <label>Name</label>
              <input [(ngModel)]="formName" name="name" placeholder="Category name" required>
            </div>
            <div class="field">
              <label>Parent</label>
              <select [(ngModel)]="formParentId" name="parentId">
                <option [ngValue]="null">None (root category)</option>
                @for (c of allCategories(); track c.id) {
                  <option [ngValue]="c.id">{{ c.parentName ? c.parentName + ' > ' : '' }}{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">{{ editId() ? 'Update' : 'Create' }}</button>
              @if (editId()) {
                <button type="button" class="btn btn-secondary" (click)="resetForm()">Cancel</button>
              }
            </div>
          </form>
        </div>

        <div class="tree-card card">
          <h3>Category Tree</h3>
          @for (c of tree(); track c.id) {
            <div class="tree-item root">
              <div class="tree-row">
                <span class="tree-name">{{ c.name }}</span>
                <div class="tree-actions">
                  <button class="btn-xs" (click)="startEdit(c)">Edit</button>
                  <button class="btn-xs danger" (click)="remove(c.id)">Delete</button>
                </div>
              </div>
              @if (c.children) {
                @for (child of c.children; track child.id) {
                  <div class="tree-item child">
                    <div class="tree-row">
                      <span class="tree-name">↳ {{ child.name }}</span>
                      <div class="tree-actions">
                        <button class="btn-xs" (click)="startEdit(child)">Edit</button>
                        <button class="btn-xs danger" (click)="remove(child.id)">Delete</button>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }
          @if (tree().length === 0) {
            <div class="empty">No categories yet</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; }
    .content-grid { display: grid; grid-template-columns: 350px 1fr; gap: 20px; }
    .form-card, .tree-card { padding: 20px; }
    .form-card h3, .tree-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    select { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; }
    .form-actions { display: flex; gap: 8px; }
    .btn-secondary { background: #f1f5f9; color: #374151; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }
    .tree-item.root { margin-bottom: 4px; }
    .tree-item.child { padding-left: 20px; }
    .tree-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; transition: background 0.15s; }
    .tree-row:hover { background: #f8fafc; }
    .tree-name { font-size: 14px; font-weight: 500; }
    .tree-actions { display: flex; gap: 4px; }
    .btn-xs { padding: 3px 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: white; font-size: 11px; cursor: pointer; }
    .btn-xs.danger { border-color: #fecaca; color: #dc2626; }
    .btn-xs:hover { background: #f8fafc; }
    .empty { padding: 20px; text-align: center; color: #9ca3af; }
    @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminCategoriesComponent implements OnInit {
  tree = signal<Category[]>([]);
  allCategories = signal<Category[]>([]);
  editId = signal<number | null>(null);
  formName = '';
  formParentId: number | null = null;

  constructor(private categoryService: CategoryService) {}

  ngOnInit() { this.load(); }

  load() {
    this.categoryService.getTree().subscribe(t => this.tree.set(t));
    this.categoryService.getAll().subscribe(a => this.allCategories.set(a));
  }

  save() {
    if (!this.formName.trim()) return;
    const data = { name: this.formName, parentId: this.formParentId ?? undefined };
    const obs = this.editId()
      ? this.categoryService.update(this.editId()!, data)
      : this.categoryService.create(data);
    obs.subscribe(() => { this.resetForm(); this.load(); });
  }

  startEdit(c: Category) {
    this.editId.set(c.id);
    this.formName = c.name;
    this.formParentId = c.parentId;
  }

  resetForm() {
    this.editId.set(null);
    this.formName = '';
    this.formParentId = null;
  }

  remove(id: number) {
    if (confirm('Delete this category?')) {
      this.categoryService.delete(id).subscribe(() => this.load());
    }
  }
}
