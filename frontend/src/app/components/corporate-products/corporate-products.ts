import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { CategoryService } from '../../services/category.service';
import { Product, Category } from '../../models/product.model';
import { productEmoji } from '../../shared/product-emoji';

@Component({
  selector: 'app-corporate-products',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="toolbar">
        <div class="search-wrap">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
            <path d="m11 11 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <input
            placeholder="Search products…"
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
            [ngModelOptions]="{ standalone: true }"
          />
        </div>
        <select [(ngModel)]="categoryFilter" [ngModelOptions]="{ standalone: true }">
          <option value="">All categories</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.name">{{ c.name }}</option>
          }
        </select>
        <button class="btn-add" type="button" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Cancel' : '+ Add product' }}
        </button>
      </div>

      @if (showForm()) {
        <div class="form-card">
          <h3>{{ editProduct() ? 'Edit product' : 'New product' }}</h3>
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
                <label>Price ($)</label>
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
              <button type="submit" class="btn-add">
                {{ editProduct() ? 'Update' : 'Create' }}
              </button>
              <button type="button" class="btn-card" (click)="resetForm()">Cancel</button>
            </div>
          </form>
        </div>
      }

      <div class="catalog-grid">
        @for (p of visibleProducts(); track p.id) {
          <div class="catalog-card">
            <div class="card-hero" aria-hidden="true">{{ heroFor(p) }}</div>
            <div class="card-body">
              <div class="card-category">{{ p.category || 'Uncategorized' }}</div>
              <div class="card-name">{{ p.name }}</div>
              @if (p.sku) {
                <div class="card-sku">{{ p.sku }}</div>
              }
              <div class="card-meta">
                <span class="card-price">\${{ p.price | number: '1.2-2' }}</span>
                <span class="card-stock" [class.low]="p.stock < 40"> {{ p.stock }} in stock </span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-card" type="button" (click)="startEdit(p)">Edit</button>
              <button class="btn-card danger" type="button" (click)="remove(p.id)">Delete</button>
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
    </div>
  `,
  styleUrls: ['./corporate-products.scss'],
})
export class CorporateProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  showForm = signal(false);
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
    this.form = {
      name: '',
      description: '',
      unitPrice: 0,
      stock: 0,
      sku: '',
      categoryId: null,
    };
  }

  remove(id: number) {
    if (confirm('Delete this product?')) {
      this.storeService.deleteProduct(id).subscribe(() => this.load());
    }
  }

  heroFor(p: Product) {
    return productEmoji(p.name, p.category);
  }
}
