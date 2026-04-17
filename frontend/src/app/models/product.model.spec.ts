import { describe, it, expect } from 'vitest';
import type {
  LoginResponse,
  ChatResponse,
  Order,
  CartItem,
  Product,
} from './product.model';

/**
 * Tests for model interfaces — type validation and data shape contracts.
 * Ensures API response structures match expected shapes.
 */

describe('Model Interfaces', () => {

  it('LoginResponse should have required fields', () => {
    const response: LoginResponse = {
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      email: 'admin@test.com',
      role: 'ADMIN',
      companyName: 'Platform Admin',
    };
    expect(response.token).toBeDefined();
    expect(response.refreshToken).toBeDefined();
    expect(response.role).toBe('ADMIN');
  });

  it('ChatResponse should handle refused state', () => {
    const refused: ChatResponse = {
      answer: 'I can only answer e-commerce related questions.',
      refused: true,
    };
    expect(refused.refused).toBe(true);
    expect(refused.sqlQuery).toBeUndefined();
    expect(refused.data).toBeUndefined();
    expect(refused.visualizationHtml).toBeUndefined();
  });

  it('ChatResponse should handle full analytics response', () => {
    const full: ChatResponse = {
      answer: 'Here are the top 5 products by revenue.',
      refused: false,
      sqlQuery: 'SELECT name, SUM(price) FROM products GROUP BY name LIMIT 5',
      data: {
        columns: ['name', 'total'],
        rows: [{ name: 'Widget A', total: 1500 }],
        row_count: 1,
      },
      visualizationHtml: '<div>chart</div>',
    };
    expect(full.refused).toBe(false);
    expect(full.data!.columns).toContain('name');
    expect(full.data!.row_count).toBe(1);
    expect(full.visualizationHtml).toBeDefined();
  });

  it('Order should include items and optional shipment', () => {
    const order: Order = {
      id: 1,
      userId: 10,
      userName: 'John Doe',
      storeId: 5,
      storeName: 'Tech Store',
      status: 'SHIPPED',
      grandTotal: 299.99,
      paymentMethod: 'CREDIT_CARD',
      salesChannel: 'WEB',
      fulfilment: 'WAREHOUSE',
      orderDate: '2026-03-15T10:00:00',
      items: [
        {
          id: 1,
          productId: 100,
          productName: 'Laptop',
          productSku: 'LPT-001',
          quantity: 1,
          price: 299.99,
          discountPercent: null,
        },
      ],
      shipment: {
        id: 1,
        orderId: 1,
        warehouse: 'Block A',
        mode: 'Road',
        status: 'IN_TRANSIT',
        trackingNumber: 'TRK-ABC123',
        carrier: 'FedEx',
        destination: 'Istanbul',
        customerCareCalls: 0,
        shippedDate: '2026-03-16T10:00:00',
        estimatedArrival: '2026-03-21T10:00:00',
        deliveredDate: '',
      },
    };
    expect(order.items).toHaveLength(1);
    expect(order.shipment).not.toBeNull();
    expect(order.shipment!.trackingNumber).toMatch(/^TRK-/);
  });

  it('Order without shipment should have null shipment', () => {
    const pendingOrder: Order = {
      id: 2,
      userId: 10,
      userName: 'John Doe',
      storeId: 5,
      storeName: 'Tech Store',
      status: 'PENDING',
      grandTotal: 49.99,
      paymentMethod: 'PAYPAL',
      salesChannel: 'MOBILE',
      fulfilment: 'STORE',
      orderDate: '2026-03-20T14:30:00',
      items: [],
      shipment: null,
    };
    expect(pendingOrder.shipment).toBeNull();
    expect(pendingOrder.status).toBe('PENDING');
  });

  it('CartItem should calculate subtotal correctly', () => {
    const item: CartItem = {
      id: 1,
      productId: 50,
      productName: 'Headphones',
      productSku: 'HP-050',
      unitPrice: 79.99,
      stock: 25,
      quantity: 3,
      subtotal: 239.97,
      storeName: 'Audio Shop',
      storeId: 3,
      addedAt: '2026-03-22T09:00:00',
    };
    expect(item.subtotal).toBeCloseTo(item.unitPrice * item.quantity, 2);
  });
});
