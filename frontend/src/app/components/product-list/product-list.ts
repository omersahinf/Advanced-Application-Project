import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { CartService } from '../../services/cart.service';
import { Product, Category } from '../../models/product.model';

import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { ProductHeroComponent } from '../../shared/product-hero/product-hero';

/**
 * Individual — catalog browse page. Replicates `Flower Prototype.html`
 * §IndProducts: a single toolbar card containing a search input with an
 * inline magnifier icon + three native selects (Category / Stores / Sort),
 * followed by an auto-fill card grid of products.
 *
 * Data constraints — backend only. The prototype renders star ratings and a
 * per-product review count; neither exists on our Product DTO so those
 * visual elements are intentionally omitted. Stores list is derived from
 * the loaded products (there's no consumer-facing stores endpoint).
 */
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, FlowerIconComponent, ProductHeroComponent],
  template: `
    <div class="page ind-products">
      <!-- Toolbar: search + Category + Store + Sort -->
      <div class="card toolbar">
        <div class="search-wrap">
          <flower-icon name="search" [size]="15" />
          <input
            class="search-input"
            type="text"
            placeholder="Search products, SKUs…"
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
          />
        </div>

        <select
          class="select cat-select"
          [(ngModel)]="selectedCategory"
          (ngModelChange)="onCategoryChange()"
        >
          <option [ngValue]="null">All Categories</option>
          @for (c of categories(); track c.id) {
            <option [ngValue]="c.id">{{ c.name }}</option>
          }
        </select>

        <select
          class="select store-select"
          [(ngModel)]="selectedStore"
          (ngModelChange)="applyFilters()"
        >
          <option [ngValue]="null">All stores</option>
          @for (s of storeOptions(); track s.id) {
            <option [ngValue]="s.id">{{ s.name }}</option>
          }
        </select>

        <select
          class="select sort-select"
          [(ngModel)]="sortOption"
          (ngModelChange)="applyFilters()"
        >
          <option value="relevance">Relevance</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="name-az">Name: A → Z</option>
          <option value="name-za">Name: Z → A</option>
        </select>
      </div>

      <!-- Grid — auto-fill minmax(240,1fr) like prototype -->
      <div class="product-grid">
        @for (p of displayProducts(); track p.id) {
          <div class="card product-card">
            <a class="hero-link" [routerLink]="['/products', p.id]" [attr.aria-label]="p.name">
              <product-hero [name]="p.name" [category]="p.category" />
            </a>

            <div class="product-body">
              <div class="product-head">
                <div class="product-info">
                  <div class="product-meta">{{ p.storeName }} · {{ p.sku }}</div>
                  <a class="product-name" [routerLink]="['/products', p.id]">{{ p.name }}</a>
                </div>
                <div class="product-price">\${{ p.price | number: '1.2-2' }}</div>
              </div>

              <div class="product-sub">
                @if (p.stock > 0) {
                  <span class="stock" [class.stock-low]="p.stock < 10">
                    {{ p.stock }} in stock
                  </span>
                } @else {
                  <span class="stock stock-out">Out of stock</span>
                }
                @if (p.category) {
                  <span class="dot">·</span>
                  <span>{{ p.category }}</span>
                }
              </div>

              <button
                type="button"
                class="btn btn-primary add-btn"
                [disabled]="p.stock === 0 || addingId() === p.id"
                (click)="addToCart(p)"
              >
                <flower-icon name="plus" [size]="13" />
                {{ addingId() === p.id ? 'Adding…' : 'Add to cart' }}
              </button>
            </div>
          </div>
        }
      </div>

      @if (displayProducts().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">
            <flower-icon name="package" [size]="22" />
          </div>
          <div class="empty-title">No products found</div>
          <div>Try a different search or category.</div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./product-list.scss'],
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  searchQuery = '';
  selectedCategory: number | null = null;
  selectedStore: number | null = null;
  sortOption: 'relevance' | 'price-asc' | 'price-desc' | 'name-az' | 'name-za' = 'relevance';

  addingId = signal<number | null>(null);

  /** Unique stores discovered from the currently loaded product list. */
  readonly storeOptions = computed(() => {
    const seen = new Map<number, string>();
    for (const p of this.products()) {
      if (!seen.has(p.storeId)) seen.set(p.storeId, p.storeName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  });

  /** Client-side filter + sort layered on top of the server response. */
  readonly displayProducts = computed(() => {
    let r = this.products();
    if (this.selectedStore !== null) {
      r = r.filter((p) => p.storeId === this.selectedStore);
    }
    const cmp = (a: Product, b: Product) => {
      switch (this.sortOption) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-az':
          return a.name.localeCompare(b.name);
        case 'name-za':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    };
    return [...r].sort(cmp);
  });

  ngOnInit() {
    this.loadProducts();
    this.categoryService.getAll().subscribe((c) => this.categories.set(c));
  }

  private loadProducts() {
    const query = this.searchQuery.trim() || undefined;
    if (this.selectedCategory !== null) {
      this.productService
        .getProductsByCategory(this.selectedCategory)
        .subscribe((p) => this.products.set(p));
    } else {
      this.productService.getProducts(query).subscribe((p) => this.products.set(p));
    }
  }

  onSearch() {
    // Debouncing kept simple — the existing service call; typing into an
    // input on the toolbar is not hot-path expensive for our scale.
    this.selectedCategory = null;
    this.loadProducts();
  }

  onCategoryChange() {
    this.searchQuery = '';
    this.loadProducts();
  }

  /** Sort + store-filter happen locally (no extra roundtrip). */
  applyFilters() {
    // Re-trigger the computed by re-setting products — it already reads
    // `this.products()` but applyFilters() keeps an explicit hook for any
    // future server-side re-querying.
    this.products.set([...this.products()]);
  }

  addToCart(p: Product) {
    if (p.stock === 0 || this.addingId() !== null) return;
    this.addingId.set(p.id);
    this.cartService.addToCart(p.id, 1).subscribe({
      next: () => this.addingId.set(null),
      error: () => this.addingId.set(null),
    });
  }
}
