export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export type TableStatus = 'available' | 'occupied' | 'reserved';

export type UserRole = 'cashier' | 'supervisor' | 'kitchen';

export type OrderStatus = 'pending' | 'paid' | 'sent_to_kitchen';

export type PaymentMethod = 'cash' | 'qr' | 'visa';
export type CancelReason = 'Customer Cancel' | 'Wrong Order';

export interface User {
  id: string;
  authUserId?: string;
  email?: string;
  name: string;
  role: UserRole;
  restaurantId?: string;
  restaurantCode?: string;
  restaurantName?: string;
  restaurantUserId?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  categoryId: string;
  emoji?: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  options?: string[];
  note?: string;
}

export interface PendingCart {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  tableNumber: string;
  customer: CustomerInfo;
  items: CartItem[];
  orderNote?: string;
  discountPercent: number;
  splitBillCount: number;
  taxPercent: number;
  createdAt: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  receiptNo: string;
}

export interface SavedCustomerContact {
  id: string;
  name: string;
  phone: string;
  updatedAt: string;
}

export interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  orderNote?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  splitBillCount: number;
  payments: PaymentLine[];
  status: OrderStatus;
  orderType: OrderType;
  customer: CustomerInfo;
  tableNumber?: string;
  createdAt: string;
  synced: boolean;
}

export interface Table {
  id: string;
  number: string;
  seats: number;
  status: TableStatus;
}

export interface ActionCard {
  id: string;
  label: string;
  icon: string;
}

export interface CreateOrderInput {
  orderNumber: string;
  items: CartItem[];
  orderNote?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  splitBillCount: number;
  payments: PaymentLine[];
  status: OrderStatus;
  orderType: OrderType;
  customer: CustomerInfo;
  tableNumber?: string;
  cashierUserId?: string;
}

export interface CancelLog {
  id: string;
  orderNumber: string;
  reason: CancelReason;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
  createdAt: string;
}
