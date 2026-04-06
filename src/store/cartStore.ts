import { create } from 'zustand';
import { CartItem, CustomerInfo, Order, OrderStatus, OrderType, PendingCart, Product } from '../types';
import { advanceOrderNumber, generateOrderNumber, generateReceiptNo } from '../data/mockData';

const DEFAULT_TAX_PERCENT = 10;

interface AddItemInput {
  product: Product;
  quantity: number;
  options?: string[];
  note?: string;
}

interface CartState {
  orderNumber: string;
  orderType: OrderType;
  tableNumber: string;
  customer: CustomerInfo;
  items: CartItem[];
  orderNote: string;
  pendingCarts: PendingCart[];
  sourceOrderStatus: OrderStatus | null;
  discountPercent: number;
  splitBillCount: number;
  taxPercent: number;

  setOrderType: (type: OrderType) => void;
  setTableNumber: (table: string) => void;
  setCustomer: (info: Partial<CustomerInfo>) => void;
  setOrderNote: (note: string) => void;
  setDiscountPercent: (percent: number) => void;
  setSplitBillCount: (count: number) => void;
  addItem: (input: AddItemInput) => void;
  updateItem: (itemId: string, input: AddItemInput) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, delta: number) => void;
  saveCurrentCartAsPending: () => PendingCart | null;
  restorePendingCart: (pendingCartId: string) => void;
  loadOrderIntoCart: (order: Order) => void;
  removePendingCart: (pendingCartId: string) => void;
  clearCart: () => void;
  resetCartState: () => void;

  subtotal: () => number;
  discount: () => number;
  tax: () => number;
  total: () => number;
  splitTotal: () => number;
  itemCount: () => number;
}

const normalizeOptions = (options?: string[]) =>
  (options ?? []).filter(Boolean).map((item) => item.trim()).sort();

const createCartItem = (input: AddItemInput): CartItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  product: input.product,
  quantity: input.quantity,
  options: normalizeOptions(input.options),
  note: input.note?.trim() || undefined,
});

const cloneCartItems = (items: CartItem[]): CartItem[] =>
  items.map((item) => ({
    ...item,
    product: { ...item.product },
    options: item.options ? [...item.options] : [],
  }));

const createFreshCartFields = () => ({
  orderNumber: advanceOrderNumber(),
  orderType: 'dine-in' as OrderType,
  tableNumber: '1',
  customer: { name: '', phone: '', receiptNo: generateReceiptNo() },
  orderNote: '',
  sourceOrderStatus: null as OrderStatus | null,
  discountPercent: 0,
  splitBillCount: 1,
  taxPercent: DEFAULT_TAX_PERCENT,
  items: [] as CartItem[],
});

const getDiscountPercentFromOrder = (order: Order) => {
  if (order.subtotal <= 0 || order.discount <= 0) return 0;
  return Math.round((order.discount / order.subtotal) * 100);
};

const getTaxPercentFromOrder = (order: Order, fallback: number) => {
  const taxableAmount = order.subtotal - order.discount;
  if (taxableAmount <= 0 || order.tax <= 0) return fallback;
  return Math.round((order.tax / taxableAmount) * 100);
};

export const useCartStore = create<CartState>((set, get) => ({
  orderNumber: generateOrderNumber(),
  orderType: 'dine-in',
  tableNumber: '1',
  customer: { name: '', phone: '', receiptNo: generateReceiptNo() },
  items: [],
  orderNote: '',
  pendingCarts: [],
  sourceOrderStatus: null,
  discountPercent: 0,
  splitBillCount: 1,
  taxPercent: DEFAULT_TAX_PERCENT,

  setOrderType: (type) => set({ orderType: type }),
  setTableNumber: (table) => set({ tableNumber: table }),
  setCustomer: (info) => set((state) => ({ customer: { ...state.customer, ...info } })),
  setOrderNote: (note) => set({ orderNote: note.trim() }),
  setDiscountPercent: (percent) =>
    set({ discountPercent: Math.max(0, Math.min(100, percent)) }),
  setSplitBillCount: (count) => set({ splitBillCount: Math.max(1, Math.floor(count)) }),

  addItem: (input) => {
    if (input.quantity <= 0) return;
    const items = get().items;
    set({ items: [...items, createCartItem(input)] });
  },

  updateItem: (itemId, input) => {
    if (input.quantity <= 0) return;

    const items = get().items;
    const target = items.find((item) => item.id === itemId);
    if (!target) return;

    const normalizedInput: AddItemInput = {
      product: input.product,
      quantity: input.quantity,
      options: normalizeOptions(input.options),
      note: input.note?.trim() || undefined,
    };

    set({
      items: items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              product: normalizedInput.product,
              quantity: normalizedInput.quantity,
              options: normalizeOptions(normalizedInput.options),
              note: normalizedInput.note,
            }
          : item
      ),
    });
  },

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    })),

  updateQty: (itemId, delta) => {
    const updated = get()
      .items.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + delta } : item
      )
      .filter((item) => item.quantity > 0);

    set({ items: updated });
  },

  saveCurrentCartAsPending: () => {
    const state = get();

    if (state.items.length === 0) {
      return null;
    }

    const pendingCart: PendingCart = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderNumber: state.orderNumber,
      orderType: state.orderType,
      tableNumber: state.tableNumber,
      customer: { ...state.customer },
      items: cloneCartItems(state.items),
      orderNote: state.orderNote,
      discountPercent: state.discountPercent,
      splitBillCount: state.splitBillCount,
      taxPercent: state.taxPercent,
      createdAt: new Date().toISOString(),
    };

    set((current) => ({
      pendingCarts: [pendingCart, ...current.pendingCarts],
      ...createFreshCartFields(),
    }));

    return pendingCart;
  },

  restorePendingCart: (pendingCartId) => {
    const target = get().pendingCarts.find((item) => item.id === pendingCartId);
    if (!target) return;

    set((state) => ({
      pendingCarts: state.pendingCarts.filter((item) => item.id !== pendingCartId),
      orderNumber: target.orderNumber,
      orderType: target.orderType,
      tableNumber: target.tableNumber,
      customer: { ...target.customer },
      items: cloneCartItems(target.items),
      orderNote: target.orderNote ?? '',
      sourceOrderStatus: null,
      discountPercent: target.discountPercent,
      splitBillCount: target.splitBillCount,
      taxPercent: target.taxPercent,
    }));
  },

  loadOrderIntoCart: (order) =>
    set((state) => ({
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableNumber ?? state.tableNumber,
      customer: { ...order.customer },
      items: cloneCartItems(order.items),
      orderNote: order.orderNote ?? '',
      sourceOrderStatus: order.status,
      discountPercent: getDiscountPercentFromOrder(order),
      splitBillCount: order.splitBillCount || 1,
      taxPercent: getTaxPercentFromOrder(order, state.taxPercent),
    })),

  removePendingCart: (pendingCartId) =>
    set((state) => ({
      pendingCarts: state.pendingCarts.filter((item) => item.id !== pendingCartId),
    })),

  clearCart: () =>
    set({
      ...createFreshCartFields(),
    }),

  resetCartState: () =>
    set({
      pendingCarts: [],
      ...createFreshCartFields(),
    }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  discount: () => Math.round((get().subtotal() * get().discountPercent) / 100),
  tax: () => {
    const taxable = Math.max(0, get().subtotal() - get().discount());
    return Math.round((taxable * get().taxPercent) / 100);
  },
  total: () => Math.max(0, get().subtotal() - get().discount() + get().tax()),
  splitTotal: () => {
    const count = get().splitBillCount;
    if (count <= 1) return get().total();
    return Math.ceil(get().total() / count);
  },
  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
