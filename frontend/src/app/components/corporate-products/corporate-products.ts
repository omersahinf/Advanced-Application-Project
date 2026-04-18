import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { CategoryService } from '../../services/category.service';
import { Product, Category } from '../../models/product.model';

@Component({
  selector: 'app-corporate-products',
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Product Management</h1>
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Cancel' : '+ Add Product' }}
        </button>
      </div>

      @if (showForm()) {
        <div class="form-card card">
          <h3>{{ editProduct() ? 'Edit Product' : 'New Product' }}</h3>
          <form (ngSubmit)="save()">
            <div class="form-grid">
              <div class="field">
                <label>Name</label>
                <input [(ngModel)]="form.name" name="name" required />
              </div>
              <div class="field">
                <label>SKU</label>
                <input [(ngModel)]="form.sku" name="sku" />
              </div>
              <div class="field">
                <label>Price</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="form.unitPrice"
                  name="unitPrice"
                  required
                />
              </div>
              <div class="field">
                <label>Stock</label>
                <input type="number" [(ngModel)]="form.stock" name="stock" required />
              </div>
              <div class="field">
                <label>Category</label>
                <select [(ngModel)]="form.categoryId" name="categoryId">
                  <option [ngValue]="null">Select category</option>
                  @for (c of categories(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
              <div class="field full">
                <label>Description</label>
                <textarea [(ngModel)]="form.description" name="description" rows="2"></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                {{ editProduct() ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      }

      <div class="search-bar">
        <input
          placeholder="Search products..."
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
          [ngModelOptions]="{ standalone: true }"
        />
      </div>

      <div class="table-card card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of products(); track p.id) {
              <tr [class.low-stock]="p.stock < 10">
                <td class="product-name">{{ p.name }}</td>
                <td>
                  <code>{{ p.sku || '-' }}</code>
                </td>
                <td>{{ p.category || '-' }}</td>
                <td>\${{ p.price | number: '1.2-2' }}</td>
                <td>
                  <span [class.stock-warn]="p.stock < 10">{{ p.stock }}</span>
                  @if (p.stock < 10) {
                    <span class="stock-alert">Low</span>
                  }
                </td>
                <td>
                  <button class="btn-xs" (click)="startEdit(p)">Edit</button>
                  <button class="btn-xs danger" (click)="remove(p.id)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (products().length === 0) {
          <div class="empty">No products found</div>
        }
      </div>
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
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .form-card {
        padding: 20px;
        margin-bottom: 20px;
      }
      .form-card h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #1a1a1a;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .form-grid .full {
        grid-column: span 2;
      }
      .field label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
        color: #666;
      }
      select {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        background: #ffffeb;
        color: #1a1a1a;
      }
      textarea {
        resize: vertical;
      }
      .form-actions {
        margin-top: 14px;
      }
      .search-bar {
        margin-bottom: 16px;
      }
      .table-card {
        padding: 0;
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      th {
        background: #f5f5e1;
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #666;
        font-size: 11px;
        text-transform: uppercase;
      }
      td {
        padding: 12px 16px;
        border-top: 1px solid #d5d5c0;
      }
      tr:hover td {
        background: #f5f5e1;
      }
      tr.low-stock td {
        background: #fef3c7;
      }
      .product-name {
        font-weight: 600;
        color: #1a1a1a;
      }
      code {
        background: #f5f5e1;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        color: #666;
      }
      .stock-warn {
        color: #dc2626;
        font-weight: 700;
      }
      .stock-alert {
        font-size: 10px;
        background: #fee2e2;
        color: #dc2626;
        padding: 1px 6px;
        border-radius: 4px;
        margin-left: 4px;
      }
      .btn-xs {
        padding: 4px 10px;
        border: 1px solid #c8c8b4;
        border-radius: 4px;
        background: #ffffeb;
        font-size: 11px;
        cursor: pointer;
        margin-right: 4px;
        color: #1a1a1a;
      }
      .btn-xs.danger {
        border-color: rgba(220, 38, 38, 0.3);
        color: #dc2626;
      }
      .btn-xs:hover {
        background: #f5f5e1;
      }
      .empty {
        padding: 40px;
        text-align: center;
        color: #666;
      }
    `,
  ],
})
export class CorporateProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  showForm = signal(false);
  editProduct = signal<Product | null>(null);
  searchQuery = '';
  form = {
    name: '',
    description: '',
    unitPrice: 0,
    stock: 0,
    sku: '',
    categoryId: null as number | null,
  };

  constructor(
    private storeService: StoreService,
    private categoryService: CategoryService,
  ) {}

  ngOnInit() {
    this.load();
    this.categoryService.getAll().subscribe((c) => this.categories.set(c));
  }

  load() {
    this.storeService.getMyProducts().subscribe((p) => this.products.set(p));
  }

  onSearch() {
    this.storeService
      .getMyProducts(this.searchQuery || undefined)
      .subscribe((p) => this.products.set(p));
  }

  save() {
    const data = { ...this.form };
    const obs = this.editProduct()
      ? this.storeService.updateProduct(this.editProduct()!.id, data)
      : this.storeService.createProduct(data);
    obs.subscribe(() => {
      this.resetForm();
      this.load();
    });
  }

  startEdit(p: Product) {
    this.editProduct.set(p);
    this.showForm.set(true);
    this.form = {
      name: p.name,
      description: p.description,
      unitPrice: p.price,
      stock: p.stock,
      sku: p.sku,
      categoryId: null,
    };
  }

  resetForm() {
    this.showForm.set(false);
    this.editProduct.set(null);
    this.form = { name: '', description: '', unitPrice: 0, stock: 0, sku: '', categoryId: null };
  }

  remove(id: number) {
    if (confirm('Delete this product?')) {
      this.storeService.deleteProduct(id).subscribe(() => this.load());
    }
  }
}
