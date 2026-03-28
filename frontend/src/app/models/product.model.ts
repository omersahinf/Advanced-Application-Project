// --- Auth ---
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  refreshToken: string;
  email: string;
  role: string;
  companyName: string;
}
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender?: string;
}
export interface UserInfo {
  id: number;
  email: string;
  role: string;
  companyName: string;
}
export interface ChatRequest {
  message: string;
}
export interface ChatResponse {
  answer: string;
  refused: boolean;
  sqlQuery?: string;
  data?: { columns: string[]; rows: Record<string, any>[]; row_count: number };
  visualizationHtml?: string;
}

// --- Product ---
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  storeId: number;
  storeName: string;
}

// --- Store ---
export interface Store {
  id: number;
  name: string;
  description: string;
  status: string;
  ownerName: string;
  ownerId: number;
  productCount: number;
  createdAt: string;
}

// --- Category ---
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  children: Category[] | null;
}

// --- Order ---
export interface Order {
  id: number;
  userId: number;
  userName: string;
  storeId: number;
  storeName: string;
  status: string;
  grandTotal: number;
  paymentMethod: string;
  salesChannel: string;
  fulfilment: string;
  orderDate: string;
  items: OrderItem[];
  shipment: Shipment | null;
}
export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  discountPercent: number | null;
}
export interface CreateOrderRequest {
  storeId: number;
  paymentMethod: string;
  items: { productId: number; quantity: number }[];
}

// --- Shipment ---
export interface Shipment {
  id: number;
  orderId: number;
  warehouse: string;
  mode: string;
  status: string;
  trackingNumber: string;
  carrier: string;
  destination: string;
  customerCareCalls: number;
  shippedDate: string;
  estimatedArrival: string;
  deliveredDate: string;
}

// --- Review ---
export interface Review {
  id: number;
  userId: number;
  userName: string;
  productId: number;
  productName: string;
  starRating: number;
  reviewBody: string;
  sentiment: string;
  helpfulVotes: number;
  totalVotes: number;
  reviewDate: string;
  corporateReply?: string;
  replyDate?: string;
}
export interface CreateReviewRequest {
  productId: number;
  starRating: number;
  reviewBody: string;
}

// --- User (admin) ---
export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  gender: string;
  createdAt: string;
  storeName: string | null;
  suspended?: boolean;
}

// --- Dashboard ---
export interface AdminDashboard {
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  topStores: { storeName: string; revenue: number }[];
}
export interface CorporateDashboard {
  storeName: string;
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  avgRating: number;
  totalReviews: number;
  ordersByStatus: Record<string, number>;
  topProducts: { productName: string; orderCount: number; revenue: number }[];
  revenueByMonth: Record<string, number>;
}
export interface IndividualDashboard {
  totalSpend: number;
  totalOrders: number;
  totalItemsPurchased: number;
  avgOrderValue: number;
  totalReviews: number;
  membershipType: string;
  ordersByStatus: Record<string, number>;
  spendByCategory: Record<string, number>;
}

// --- Cart ---
export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  unitPrice: number;
  stock: number;
  quantity: number;
  subtotal: number;
  storeName: string;
  storeId: number;
  addedAt: string;
}
export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

// --- Audit Log ---
export interface AuditLog {
  id: number;
  userId: number;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  timestamp: string;
}

// --- Store Comparison ---
export interface StoreComparison {
  storeId: number;
  storeName: string;
  ownerName: string;
  status: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  totalReviews: number;
}

// --- Customer Segmentation ---
export interface CustomerSegmentation {
  byMembership: Record<string, number>;
  byCity: Record<string, number>;
  spendByMembership: Record<string, number>;
  totalCustomers: number;
  avgSpend: number;
}

// --- Profile Update ---
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  gender?: string;
  age?: number;
  city?: string;
}
