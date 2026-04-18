import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

import { LoginComponent } from './components/login/login';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Shared
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/product-list/product-list').then((m) => m.ProductListComponent),
  },
  {
    path: 'products/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/product-detail/product-detail').then((m) => m.ProductDetailComponent),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chatbot/chatbot').then((m) => m.ChatbotComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile').then((m) => m.ProfileComponent),
  },

  // Individual
  {
    path: 'cart',
    canActivate: [roleGuard('INDIVIDUAL')],
    loadComponent: () => import('./components/cart/cart').then((m) => m.CartComponent),
  },
  {
    path: 'dashboard',
    canActivate: [roleGuard('INDIVIDUAL')],
    loadComponent: () =>
      import('./components/individual-dashboard/individual-dashboard').then(
        (m) => m.IndividualDashboardComponent,
      ),
  },
  {
    path: 'orders',
    canActivate: [roleGuard('INDIVIDUAL')],
    loadComponent: () =>
      import('./components/my-orders/my-orders').then((m) => m.MyOrdersComponent),
  },
  {
    path: 'checkout/:orderId',
    canActivate: [roleGuard('INDIVIDUAL')],
    loadComponent: () => import('./components/checkout/checkout').then((m) => m.CheckoutComponent),
  },
  {
    path: 'reviews',
    canActivate: [roleGuard('INDIVIDUAL')],
    loadComponent: () =>
      import('./components/my-reviews/my-reviews').then((m) => m.MyReviewsComponent),
  },

  // Admin
  {
    path: 'admin',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/users',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-users/admin-users').then((m) => m.AdminUsersComponent),
  },
  {
    path: 'admin/stores',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-stores/admin-stores').then((m) => m.AdminStoresComponent),
  },
  {
    path: 'admin/categories',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-categories/admin-categories').then(
        (m) => m.AdminCategoriesComponent,
      ),
  },
  {
    path: 'admin/analytics',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-analytics/admin-analytics').then((m) => m.AdminAnalyticsComponent),
  },
  {
    path: 'admin/audit',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-audit/admin-audit').then((m) => m.AdminAuditComponent),
  },
  {
    path: 'admin/settings',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./components/admin-settings/admin-settings').then((m) => m.AdminSettingsComponent),
  },

  // Corporate
  {
    path: 'corporate',
    canActivate: [roleGuard('CORPORATE')],
    loadComponent: () =>
      import('./components/corporate-dashboard/corporate-dashboard').then(
        (m) => m.CorporateDashboardComponent,
      ),
  },
  {
    path: 'corporate/products',
    canActivate: [roleGuard('CORPORATE')],
    loadComponent: () =>
      import('./components/corporate-products/corporate-products').then(
        (m) => m.CorporateProductsComponent,
      ),
  },
  {
    path: 'corporate/orders',
    canActivate: [roleGuard('CORPORATE')],
    loadComponent: () =>
      import('./components/corporate-orders/corporate-orders').then(
        (m) => m.CorporateOrdersComponent,
      ),
  },
  {
    path: 'corporate/reviews',
    canActivate: [roleGuard('CORPORATE')],
    loadComponent: () =>
      import('./components/corporate-reviews/corporate-reviews').then(
        (m) => m.CorporateReviewsComponent,
      ),
  },

  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: '**', redirectTo: '/products' },
];
