/**
 * Corporate Products — pixel-parity replica of Flower Prototype.html §CorpProducts.
 *
 * Inventory (verbatim from prototype):
 *   Page title:   "Products Catalog 📦"   (serif, 32px)
 *   Subtitle:     "Manage your inventory"
 *   Primary CTA:  [+ Add Product]          (top-right, btn-primary)
 *   Filters row:  [All Categories ▾ 160w] [🔍 Search products…  280w]
 *   Card grid:    repeat(auto-fill, minmax(240px, 1fr)), gap 16
 *                 → emoji hero (aspect-ratio 1.6, bg-2, border-bottom)
 *                 → body: name (14/600) · price (16/700 green) · stock
 *                   (11px, red if <40) · actions row (border-top):
 *                   [ ✎ Edit  (flex 1) ]  [ 🗑 btn-danger ]
 *   Edit dialog:  <Dialog title="Edit product" | "New product" width=520>
 *                 footer: [Cancel]  [Save]
 *                 fields: Name; {SKU | Category}; {Price (USD) | Stock}; Description
 *
 * Prototype elements NOT wired because the backend DTO (Product) has no
 * stock aging, rating, or review count on this endpoint:
 *   — per-card Stars row ("4.6 · 234")
 * Category options in the prototype are a hard-coded trio. Our backend
 * ships a real /api/categories endpoint so we render its real names.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { CategoryService } from '../../services/category.service';
import { Product, Category } from '../../models/product.model';
import { ProductHeroComponent } from '../../shared/product-hero/product-hero';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { FlowerDialogComponent } from '../../shared/flower-dialog/flower-dialog';

@Component({
  selector: 'app-corporate-products',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    ProductHeroComponent,
    FlowerIconComponent,
    FlowerDialogComponent,
  ],
  template: `
    <div class="page">
      <!-- Page header ————————————————————————————————— -->
      <div class="page-header">
        <div class="page-title-block">
          <h1 class="page-title">
            Products Catalog <span class="title-emoji" aria-hidden="true">📦</span>
          </h1>
          <div class="page-sub">Manage your inventory</div>
        </div>
        <button type="button" class="btn btn-primary" (click)="openCreate()">
          <flower-icon name="plus" [size]="13" />
          Add Product
        </button>
      </div>

      <!-- Filters ———————————————————————————————————— -->
      <div class="filters">
        <select
          class="select cat-select"
          [(ngModel)]="categoryFilter"
          [ngModelOptions]="{ standalone: true }"
        >
          <option value="">All Categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.name">{{ c.name }}</option>
          }
        </select>
        <div class="search-wrap">
          <span class="search-ico" aria-hidden="true">🔍</span>
          <input
            class="input"
            placeholder="Search products…"
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
            [ngModelOptions]="{ standalone: true }"
          />
        </div>
      </div>

      <!-- Card grid ———————————————————————————————— -->
      <div class="catalog-grid">
        @for (p of visibleProducts(); track p.id) {
          <div class="catalog-card card">
            <product-hero [name]="p.name" [category]="p.category" />
            <div class="card-body">
              <div class="card-name">{{ p.name }}</div>
              <div class="card-meta">
                <span class="card-price">\${{ p.price | number: '1.2-2' }}</span>
                <span class="card-stock" [class.low]="p.stock < 40">
                  {{ p.stock }} in stock
                </span>
              </div>
              <div class="card-actions">
                <button type="button" class="btn btn-sm btn-ghost edit-btn" (click)="openEdit(p)">
                  <flower-icon name="edit" [size]="12" />
                  Edit
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost btn-danger trash-btn"
                  (click)="remove(p)"
                  aria-label="Delete product"
                >
                  <flower-icon name="trash" [size]="12" />
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (visibleProducts().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">📦</div>
          <div class="empty-title">No products found</div>
          <div>Try clearing your filters or add your first product.</div>
        </div>
      }

      <!-- Edit / New dialog —————————————————————————— -->
      @if (dialogOpen()) {
        <flower-dialog
          [title]="editProduct() ? 'Edit product' : 'New product'"
          [width]="520"
          (closed)="closeDialog()"
        >
          <div class="dlg-form">
            <div class="field">
              <label class="label">Name</label>
              <input
                class="input"
                [(ngModel)]="form.name"
                [ngModelOptions]="{ standalone: true }"
              />
            </div>
            <div class="dlg-row">
              <div class="field">
                <label class="label">SKU</label>
                <input
                  class="input"
                  [(ngModel)]="form.sku"
                  [ngModelOptions]="{ standalone: true }"
                />
              </div>
              <div class="field">
                <label class="label">Category</label>
                <select
                  class="select"
                  [(ngModel)]="form.categoryId"
                  [ngModelOptions]="{ standalone: true }"
                >
                  <option [ngValue]="null">Select category</option>
                  @for (c of categories(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="dlg-row">
              <div class="field">
                <label class="label">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  class="input"
                  [(ngModel)]="form.unitPrice"
                  [ngModelOptions]="{ standalone: true }"
                />
              </div>
              <div class="field">
                <label class="label">Stock</label>
                <input
                  type="number"
                  class="input"
                  [(ngModel)]="form.stock"
                  [ngModelOptions]="{ standalone: true }"
                />
              </div>
            </div>
            <div class="field">
              <label class="label">Description</label>
              <textarea
                class="textarea"
                rows="3"
                [(ngModel)]="form.description"
                [ngModelOptions]="{ standalone: true }"
              ></textarea>
            </div>
          </div>
          <div footer>
            <button type="button" class="btn" (click)="closeDialog()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!form.name.trim()"
              (click)="save()"
            >
              Save
            </button>
          </div>
        </flower-dialog>
      }
    </div>
  `,
  styleUrls: ['./corporate-products.scss'],
})
export class CorporateProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  dialogOpen = signal(false);
  editProduct = signal<Product | null>(null);
  searchQuery = '';
  categoryFilter = '';

  form = {
    name: '',
    description: '',
    unitPrice: 0,
    stock: 0,
    sku: '',
    categoryId: null as number | null,
  };

  visibleProducts = computed(() => {
    const cat = this.categoryFilter;
    const list = this.products();
    return cat ? list.filter((p) => p.category === cat) : list;
  });

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

  openCreate() {
    this.editProduct.set(null);
    this.resetForm();
    this.dialogOpen.set(true);
  }

  openEdit(p: Product) {
    this.editProduct.set(p);
    this.form = {
      name: p.name,
      description: p.description,
      unitPrice: p.price,
      stock: p.stock,
      sku: p.sku,
      categoryId: this.categories().find((c) => c.name === p.category)?.id ?? null,
    };
    this.dialogOpen.set(true);
  }

  closeDialog() {
    this.dialogOpen.set(false);
    this.editProduct.set(null);
    this.resetForm();
  }

  save() {
    const data = { ...this.form };
    const obs = this.editProduct()
      ? this.storeService.updateProduct(this.editProduct()!.id, data)
      : this.storeService.createProduct(data);
    obs.subscribe(() => {
      this.closeDialog();
      this.load();
    });
  }

  remove(p: Product) {
    if (confirm(`Delete "${p.name}"?`)) {
      this.storeService.deleteProduct(p.id).subscribe(() => this.load());
    }
  }

  private resetForm() {
    this.form = {
      name: '',
      description: '',
      unitPrice: 0,
      stock: 0,
      sku: '',
      categoryId: null,
    };
  }
}
