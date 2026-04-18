import { Component, OnInit, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { Product, Category } from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Browse Products</h1>
      </div>

      <div class="toolbar">
        <div class="search-wrapper">
          <svg
            class="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="Search products by name, description..."
            [(ngModel)]="searchQuery"
            (input)="onSearch()"
          />
          @if (searchQuery) {
            <button
              class="search-clear"
              type="button"
              aria-label="Clear search"
              (click)="searchQuery = ''; onSearch()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          }
        </div>
        <div class="icon-menu" [class.open]="filterOpen()">
          <button
            class="icon-btn"
            type="button"
            aria-label="Filter by category"
            title="Filter"
            [class.active]="selectedCategory !== null"
            (click)="toggleFilter($event)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            @if (selectedCategory !== null) {
              <span class="dot"></span>
            }
          </button>
          @if (filterOpen()) {
            <div class="dropdown" role="menu">
              <div class="dropdown-header">Category</div>
              <button
                class="dropdown-item"
                [class.selected]="selectedCategory === null"
                (click)="pickCategory(null)"
              >
                All Categories
              </button>
              @for (c of categories(); track c.id) {
                <button
                  class="dropdown-item"
                  [class.selected]="selectedCategory === c.id"
                  (click)="pickCategory(c.id)"
                >
                  {{ c.name }}
                </button>
              }
            </div>
          }
        </div>

        <div class="icon-menu" [class.open]="sortOpen()">
          <button
            class="icon-btn"
            type="button"
            aria-label="Sort products"
            title="Sort"
            [class.active]="sortOption !== ''"
            (click)="toggleSort($event)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h13"></path>
              <path d="M3 12h9"></path>
              <path d="M3 18h5"></path>
              <path d="M17 8V20"></path>
              <path d="M21 16l-4 4-4-4"></path>
            </svg>
            @if (sortOption !== '') {
              <span class="dot"></span>
            }
          </button>
          @if (sortOpen()) {
            <div class="dropdown" role="menu">
              <div class="dropdown-header">Sort By</div>
              <button
                class="dropdown-item"
                [class.selected]="sortOption === ''"
                (click)="pickSort('')"
              >
                Default
              </button>
              <button
                class="dropdown-item"
                [class.selected]="sortOption === 'price-asc'"
                (click)="pickSort('price-asc')"
              >
                Price: Low → High
              </button>
              <button
                class="dropdown-item"
                [class.selected]="sortOption === 'price-desc'"
                (click)="pickSort('price-desc')"
              >
                Price: High → Low
              </button>
              <button
                class="dropdown-item"
                [class.selected]="sortOption === 'name-az'"
                (click)="pickSort('name-az')"
              >
                Name: A → Z
              </button>
              <button
                class="dropdown-item"
                [class.selected]="sortOption === 'name-za'"
                (click)="pickSort('name-za')"
              >
                Name: Z → A
              </button>
              <button
                class="dropdown-item"
                [class.selected]="sortOption === 'stock-low'"
                (click)="pickSort('stock-low')"
              >
                Stock: Low → High
              </button>
            </div>
          }
        </div>
      </div>

      <div class="product-grid">
        @for (p of products(); track p.id) {
          <a [routerLink]="['/products', p.id]" class="product-card card">
            <div class="product-category">{{ p.category || 'Uncategorized' }}</div>
            <h3>{{ p.name }}</h3>
            <p class="product-desc">{{ p.description }}</p>
            <div class="product-footer">
              <span class="product-price">\${{ p.price | number: '1.2-2' }}</span>
              <span class="product-store">{{ p.storeName }}</span>
            </div>
            <div class="product-stock" [class.low]="p.stock < 10">
              {{ p.stock > 0 ? p.stock + ' in stock' : 'Out of stock' }}
            </div>
          </a>
        }
      </div>

      @if (products().length === 0) {
        <div class="empty card">No products found</div>
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
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .toolbar {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        align-items: stretch;
      }
      .search-wrapper {
        position: relative;
        flex: 3;
        display: flex;
        align-items: center;
        min-width: 0;
      }
      .search-icon {
        position: absolute;
        left: 18px;
        top: 50%;
        transform: translateY(-50%);
        color: #6b6b58;
        pointer-events: none;
        z-index: 1;
      }
      .search-input {
        width: 100% !important;
        height: 52px !important;
        padding: 0 44px 0 46px !important;
        font-family:
          'Inter',
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          sans-serif !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        line-height: 52px !important;
        letter-spacing: -0.01em !important;
        color: #1a1a1a !important;
        background: #ffffeb !important;
        border: 1.5px solid #c8c8b4 !important;
        border-radius: 12px !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        transition:
          border-color 0.15s,
          box-shadow 0.15s;
        outline: none;
        -webkit-text-fill-color: #1a1a1a;
        caret-color: #034f46;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .search-input::placeholder {
        color: #9a9a86 !important;
        font-weight: 400;
        letter-spacing: -0.01em;
        opacity: 1;
      }
      .search-input:hover {
        border-color: #b8b89e;
      }
      .search-input:focus {
        border-color: #034f46;
        box-shadow:
          0 0 0 3px rgba(3, 79, 70, 0.15),
          0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .search-input::-webkit-search-cancel-button {
        display: none;
      }
      .search-clear {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: #e4e4d0;
        color: #4a4a3a;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition:
          background 0.15s,
          color 0.15s;
      }
      .search-clear:hover {
        background: #d5d5c0;
        color: #1a1a1a;
      }
      .icon-menu {
        position: relative;
        flex: 0 0 auto;
      }
      .icon-btn {
        position: relative;
        width: 52px;
        height: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #ffffeb;
        border: 1.5px solid #c8c8b4;
        border-radius: 12px;
        color: #4a4a3a;
        cursor: pointer;
        padding: 0;
        transition:
          border-color 0.15s,
          color 0.15s,
          background 0.15s,
          box-shadow 0.15s;
      }
      .icon-btn:hover {
        border-color: #034f46;
        color: #034f46;
      }
      .icon-menu.open .icon-btn,
      .icon-btn.active {
        border-color: #034f46;
        color: #034f46;
        background: #f5f5d8;
        box-shadow: 0 0 0 3px rgba(3, 79, 70, 0.12);
      }
      .icon-btn .dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #034f46;
        border: 2px solid #ffffeb;
      }
      .dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 220px;
        background: #ffffeb;
        border: 1.5px solid #c8c8b4;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        padding: 6px;
        z-index: 100;
        font-family:
          'Inter',
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          sans-serif;
        animation: dropdownIn 0.12s ease-out;
      }
      @keyframes dropdownIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .dropdown-header {
        padding: 8px 12px 6px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #6b6b58;
      }
      .dropdown-item {
        display: block;
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        padding: 9px 12px;
        font-size: 14px;
        font-weight: 500;
        color: #1a1a1a;
        border-radius: 8px;
        cursor: pointer;
        transition:
          background 0.1s,
          color 0.1s;
      }
      .dropdown-item:hover {
        background: #f0e9d0;
      }
      .dropdown-item.selected {
        background: #034f46;
        color: #ffffeb;
      }
      @media (max-width: 768px) {
        .toolbar {
          flex-direction: row;
        }
        .dropdown {
          right: 0;
          left: auto;
        }
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .product-card {
        padding: 20px;
        text-decoration: none;
        color: #1a1a1a;
        transition: all 0.15s;
        display: flex;
        flex-direction: column;
      }
      .product-card:hover {
        transform: translateY(-3px);
        border-color: rgba(3, 79, 70, 0.3);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      }
      .product-category {
        font-size: 11px;
        font-weight: 600;
        color: #034f46;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }
      .product-card h3 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #1a1a1a;
      }
      .product-desc {
        font-size: 13px;
        color: #666;
        line-height: 1.4;
        flex: 1;
        margin-bottom: 12px;
      }
      .product-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .product-price {
        font-size: 20px;
        font-weight: 700;
        color: #16a34a;
      }
      .product-store {
        font-size: 12px;
        color: #666;
      }
      .product-stock {
        font-size: 12px;
        color: #16a34a;
        font-weight: 500;
      }
      .product-stock.low {
        color: #dc2626;
      }
      .empty {
        padding: 40px;
        text-align: center;
        color: #666;
      }
    `,
  ],
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  searchQuery = '';
  selectedCategory: number | null = null;
  sortOption = '';
  filterOpen = signal(false);
  sortOpen = signal(false);

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private host: ElementRef,
  ) {}

  toggleFilter(e: Event) {
    e.stopPropagation();
    this.sortOpen.set(false);
    this.filterOpen.update((v) => !v);
  }

  toggleSort(e: Event) {
    e.stopPropagation();
    this.filterOpen.set(false);
    this.sortOpen.update((v) => !v);
  }

  pickCategory(id: number | null) {
    this.selectedCategory = id;
    this.filterOpen.set(false);
    this.onCategoryChange();
  }

  pickSort(opt: string) {
    this.sortOption = opt;
    this.sortOpen.set(false);
    this.onSort();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) {
      this.filterOpen.set(false);
      this.sortOpen.set(false);
    }
  }

  ngOnInit() {
    this.productService.getProducts().subscribe((p) => this.products.set(p));
    this.categoryService.getAll().subscribe((c) => this.categories.set(c));
  }

  onSearch() {
    this.selectedCategory = null;
    this.productService
      .getProducts(this.searchQuery || undefined)
      .subscribe((p) => this.products.set(p));
  }

  onCategoryChange() {
    this.searchQuery = '';
    if (this.selectedCategory) {
      this.productService
        .getProductsByCategory(this.selectedCategory)
        .subscribe((p) => this.products.set(p));
    } else {
      this.productService.getProducts().subscribe((p) => this.products.set(p));
    }
  }

  onSort() {
    const sorted = [...this.products()];
    switch (this.sortOption) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name-az':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-za':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'stock-low':
        sorted.sort((a, b) => a.stock - b.stock);
        break;
    }
    this.products.set(sorted);
  }
}
