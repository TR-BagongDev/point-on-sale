/**
 * API Response Type Definitions
 *
 * This file contains TypeScript types for all API responses in the application.
 * These types ensure type safety when consuming API routes.
 */

// ============================================================================
// Common Response Types
// ============================================================================

export interface ApiErrorResponse {
  error: string;
}

export interface ApiSuccessResponse {
  success: true;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "KASIR";
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListResponse extends Array<User> {}

export interface UserResponse extends User {}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
}

export interface CategoryWithMenus extends Category {
  menus: Menu[];
}

export interface CategoryListResponse extends Array<CategoryWithMenus> {}

export interface CategoryResponse extends CategoryWithMenus {}

// ============================================================================
// Menu Types
// ============================================================================

export interface Menu {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuWithCategory extends Menu {
  category: Category;
}

export interface MenuListResponse extends Array<MenuWithCategory> {}

export interface MenuResponse extends MenuWithCategory {}

// ============================================================================
// Order Item Types
// ============================================================================

export interface OrderItem {
  id: string;
  orderId: string;
  menuId: string;
  quantity: number;
  price: number;
  notes: string | null;
}

export interface OrderItemWithMenu extends OrderItem {
  menu: Menu;
}

// ============================================================================
// Order Types
// ============================================================================

export interface OrderUser {
  id: string;
  name: string;
  email?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithItems extends Order {
  user: OrderUser;
  items: OrderItemWithMenu[];
}

export interface OrderListResponse extends Array<OrderWithItems> {}

export interface OrderResponse extends OrderWithItems {}

// ============================================================================
// Order Modification Types
// ============================================================================

export interface OrderModification {
  id: string;
  orderId: string;
  userId: string;
  action: string;
  description: string;
  changes: string | null;
  createdAt: Date;
}

export interface OrderModificationListResponse extends Array<OrderModification> {}

// ============================================================================
// Shift Types
// ============================================================================

export interface Shift {
  id: string;
  userId: string;
  status: string;
  startingCash: number;
  endingCash: number | null;
  expectedCash: number | null;
  discrepancy: number | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftUser {
  id: string;
  name: string;
  email: string;
}

export interface ShiftWithUser extends Shift {
  user: ShiftUser;
}

export interface ShiftWithOrders extends ShiftWithUser {
  orders: Order[];
}

export interface ShiftListResponse extends Array<ShiftWithUser> {}

export interface ShiftResponse extends ShiftWithUser {}

// ============================================================================
// Settings Types
// ============================================================================

export interface Settings {
  id: string;
  storeName: string;
  address: string | null;
  phone: string | null;
  taxRate: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsResponse extends Settings {}

// ============================================================================
// Receipt Template Types
// ============================================================================

export interface ReceiptTemplate {
  id: string;
  name: string;
  header: string | null;
  footer: string | null;
  logo: string | null;
  showDate: boolean;
  showTime: boolean;
  showCashier: boolean;
  showTax: boolean;
  paperWidth: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptTemplateResponse extends ReceiptTemplate {}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SalesByHourData {
  hour: number;
  total: number;
  count: number;
}

export interface SalesByHourResponse extends Array<SalesByHourData> {}

export interface TopSellingItem {
  menuId: string;
  menuName: string;
  categoryName: string;
  totalSold: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface TopSellingItemsResponse extends Array<TopSellingItem> {}

export interface PaymentDistribution {
  paymentMethod: string;
  count: number;
  total: number;
  percentage: number;
}

export interface PaymentDistributionResponse extends Array<PaymentDistribution> {}

export interface SalesTrendData {
  date: Date;
  total: number;
  count: number;
}

export interface SalesTrendResponse extends Array<SalesTrendData> {}

export interface PeriodComparison {
  currentPeriod: {
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
  };
  previousPeriod: {
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
  };
  changes: {
    revenueChange: number;
    revenueChangePercent: number;
    orderCountChange: number;
    orderCountChangePercent: number;
    averageOrderValueChange: number;
    averageOrderValueChangePercent: number;
  };
}

export interface AnalyticsResponse {
  salesByHour: SalesByHourResponse;
  topItems: TopSellingItemsResponse;
  bottomItems: TopSellingItemsResponse;
  paymentDistribution: PaymentDistributionResponse;
  salesTrend: SalesTrendResponse;
  periodComparison?: PeriodComparison;
}

// ============================================================================
// Activity Log Types
// ============================================================================

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string | null;
  targetUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ActivityLogListResponse extends Array<ActivityLog> {}

// ============================================================================
// Generic API Response Types
// ============================================================================

export type ApiResponse<T> = T | ApiErrorResponse;

// Helper type for successful data responses
export type DataResponse<T> = ApiResponse<T>;

// Helper type for delete/success operations
export type SuccessResponse = ApiResponse<ApiSuccessResponse>;
