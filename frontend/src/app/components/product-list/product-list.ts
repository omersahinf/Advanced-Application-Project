import { Component, OnInit, signal } from '@angular/core';
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
        <input class="search-input" placeholder="Search products..." [(ngModel)]="searchQuery" (input)="onSearch()">
        <select [(ngModel)]="selectedCategory" (change)="onCategoryChange()">
          <option [ngValue]="null">All Categories</option>
          @for (c of categories(); track c.id) {
            <option [ngValue]="c.id">{{ c.name }}</option>
          }
        </select>
      </div>

      <div class="product-grid">
        @for (p of products(); track p.id) {
          <a [routerLink]="['/products', p.id]" class="product-card card">
            <div class="product-category">{{ p.category || 'Uncategorized' }}</div>
            <h3>{{ p.name }}</h3>
            <p class="product-desc">{{ p.description }}</p>
            <div class="product-footer">
              <span class="product-price">\${{ p.price | number:'1.2-2' }}</span>
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
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
    .search-input { flex: 1; }
    select { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; min-width: 200px; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .product-card {
      padding: 20px; text-decoration: none; color: inherit; transition: all 0.15s;
      display: flex; flex-direction: column;
    }
    .product-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    .product-category { font-size: 11px; font-weight: 600; color: #4361ee; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .product-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .product-desc { font-size: 13px; color: #64748b; line-height: 1.4; flex: 1; margin-bottom: 12px; }
    .product-footer { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .product-price { font-size: 20px; font-weight: 700; color: #16a34a; }
    .product-store { font-size: 12px; color: #9ca3af; }
    .product-stock { font-size: 12px; color: #16a34a; font-weight: 500; }
    .product-stock.low { color: #dc2626; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; }
  `]
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  searchQuery = '';
  selectedCategory: number | null = null;

  constructor(private productService: ProductService, private categoryService: CategoryService) {}

  ngOnInit() {
    this.productService.getProducts().subscribe(p => this.products.set(p));
    this.categoryService.getAll().subscribe(c => this.categories.set(c));
  }

  onSearch() {
    this.selectedCategory = null;
    this.productService.getProducts(this.searchQuery || undefined).subscribe(p => this.products.set(p));
  }

  onCategoryChange() {
    this.searchQuery = '';
    if (this.selectedCategory) {
      this.productService.getProductsByCategory(this.selectedCategory).subscribe(p => this.products.set(p));
    } else {
      this.productService.getProducts().subscribe(p => this.products.set(p));
    }
  }
}
