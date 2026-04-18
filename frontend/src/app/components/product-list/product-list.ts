import { Component, OnInit, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { Product, Category } from '../../models/product.model';
import { productEmoji } from '../../shared/product-emoji';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="toolbar">
        <div class="search-wrapper">
          <svg
            class="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
            placeholder="Search products by name, description…"
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
                width="11"
                height="11"
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
              width="18"
              height="18"
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
              width="18"
              height="18"
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
                Relevance
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
          <a [routerLink]="['/products', p.id]" class="product-card">
            <div class="product-hero" aria-hidden="true">{{ heroFor(p) }}</div>
            <div class="product-body">
              <div class="product-category">{{ p.category || 'Uncategorized' }}</div>
              <div class="product-name">{{ p.name }}</div>
              <div class="product-desc">{{ p.description }}</div>
              <div class="product-meta">
                <span class="product-price">\${{ p.price | number: '1.2-2' }}</span>
                <span class="product-stock" [class.low]="p.stock < 10">
                  {{ p.stock > 0 ? p.stock + ' in stock' : 'Out of stock' }}
                </span>
              </div>
              <div class="product-store">{{ p.storeName }}</div>
            </div>
          </a>
        }
      </div>

      @if (products().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon" aria-hidden="true">📦</div>
          <div class="empty-title">No products found</div>
          <div>Try a different search or category.</div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./product-list.scss'],
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

  heroFor(p: Product) {
    return productEmoji(p.name, p.category);
  }

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
