import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import {
  enqueueOrder,
  enqueueStatusUpdate,
  getQueuedOrders,
  getQueuedStatusUpdates,
  replaceQueue,
  replaceStatusQueue,
  updateQueuedOrderStatus,
} from '../services/offlineQueue';
import {
  createOrder,
  fetchOrders,
  hasOrderRealtimeSync,
  hasRemoteOrderAccess,
  subscribeOrdersRealtime,
  updateOrderStatus as updateOrderStatusRemote,
} from '../services/orderService';
import { CancelLog, CancelReason, CreateOrderInput, Order, OrderStatus } from '../types';
import { createCancelLog } from '../utils/cancelLog';

interface OrderState {
  orders: Order[];
  cancelLogs: CancelLog[];
  isLoading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  initialized: boolean;
  initializeOrders: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  createOrder: (orderInput: CreateOrderInput) => Promise<Order>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addCancelLog: (payload: {
    orderNumber: string;
    reason: CancelReason;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    itemCount: number;
  }) => void;
  getByStatus: (status: OrderStatus) => Order[];
  resetOrderState: () => void;
}

let netInfoUnsubscribe: (() => void) | null = null;
let realtimeSubscriptionCleanUp: (() => void) | null = null;

const calculatePendingCount = async () => {
  const [orderQueue, statusQueue] = await Promise.all([
    getQueuedOrders(),
    getQueuedStatusUpdates(),
  ]);
  return orderQueue.length + statusQueue.length;
};

const syncAllQueues = async (set: (fn: (state: OrderState) => Partial<OrderState>) => void) => {
  if (!hasRemoteOrderAccess) return;

  const queuedOrders = await getQueuedOrders();
  if (queuedOrders.length > 0) {
    const remainingOrders = [];
    for (const item of queuedOrders) {
      try {
        const created = await createOrder(item.payload);
        set((state) => ({
          orders: state.orders.map((order) => (order.id === item.localOrderId ? created : order)),
        }));
      } catch {
        remainingOrders.push(item);
      }
    }
    await replaceQueue(remainingOrders);
  }

  const queuedStatuses = await getQueuedStatusUpdates();
  if (queuedStatuses.length > 0) {
    const remainingStatuses = [];
    for (const item of queuedStatuses) {
      try {
        await updateOrderStatusRemote(item.orderId, item.status);
      } catch {
        remainingStatuses.push(item);
      }
    }
    await replaceStatusQueue(remainingStatuses);
  }
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  cancelLogs: [],
  isLoading: true,
  isOnline: true,
  pendingSyncCount: 0,
  initialized: false,

  initializeOrders: async () => {
    if (get().initialized) return;

    set(() => ({ isLoading: true }));

    const netState = await NetInfo.fetch();
    const online = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    set(() => ({ isOnline: online }));

    try {
      if (online && hasRemoteOrderAccess) {
        await syncAllQueues(set);
        const remoteOrders = await fetchOrders();
        set(() => ({ orders: remoteOrders }));
      }
    } catch {
      // Keep local state when remote refresh fails.
    } finally {
      const pendingCount = await calculatePendingCount();
      set(() => ({
        pendingSyncCount: pendingCount,
        isLoading: false,
        initialized: true,
      }));
    }

    if (!netInfoUnsubscribe) {
      netInfoUnsubscribe = NetInfo.addEventListener(async (state) => {
        const nowOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
        set(() => ({ isOnline: nowOnline }));

        if (nowOnline && hasRemoteOrderAccess) {
          try {
            await syncAllQueues(set);
            const remoteOrders = await fetchOrders();
            set(() => ({ orders: remoteOrders }));
          } finally {
            const pendingCount = await calculatePendingCount();
            set(() => ({ pendingSyncCount: pendingCount }));
          }
        }
      });
    }

    if (!realtimeSubscriptionCleanUp && hasOrderRealtimeSync) {
      const channel = subscribeOrdersRealtime(async () => {
        try {
          const remoteOrders = await fetchOrders();
          set(() => ({ orders: remoteOrders }));
        } catch {
          // Ignore realtime refresh errors.
        }
      });
      realtimeSubscriptionCleanUp = () => channel?.unsubscribe();
    }
  },

  refreshOrders: async () => {
    if (!hasRemoteOrderAccess) return;
    const data = await fetchOrders();
    set(() => ({ orders: data }));
  },

  createOrder: async (orderInput) => {
    const localOrderId = `local-${Date.now()}`;
    const optimisticOrder: Order = {
      id: localOrderId,
      orderNumber: orderInput.orderNumber,
      items: orderInput.items,
      orderNote: orderInput.orderNote,
      subtotal: orderInput.subtotal,
      discount: orderInput.discount,
      tax: orderInput.tax,
      total: orderInput.total,
      splitBillCount: orderInput.splitBillCount,
      payments: orderInput.payments,
      status: orderInput.status,
      orderType: orderInput.orderType,
      customer: orderInput.customer,
      tableNumber: orderInput.tableNumber,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    set((state) => ({ orders: [optimisticOrder, ...state.orders] }));

    const isOnline = get().isOnline;
    if (!isOnline || !hasRemoteOrderAccess) {
      const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await enqueueOrder({ queueId, localOrderId, payload: orderInput });
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
      return optimisticOrder;
    }

    try {
      const saved = await createOrder(orderInput);
      set((state) => ({
        orders: state.orders.map((order) => (order.id === optimisticOrder.id ? saved : order)),
      }));
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
      return saved;
    } catch {
      const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await enqueueOrder({ queueId, localOrderId, payload: orderInput });
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
      return optimisticOrder;
    }
  },

  updateStatus: async (orderId, status) => {
    const target = get().orders.find((order) => order.id === orderId);

    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              synced: order.synced && get().isOnline,
            }
          : order
      ),
    }));

    if (!target) return;

    if (!target.synced || orderId.startsWith('local-')) {
      await updateQueuedOrderStatus(orderId, status);
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
      return;
    }

    if (!get().isOnline || !hasRemoteOrderAccess) {
      const queueId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await enqueueStatusUpdate({ queueId, orderId, status });
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
      return;
    }

    try {
      await updateOrderStatusRemote(orderId, status);
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
    } catch {
      const queueId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await enqueueStatusUpdate({ queueId, orderId, status });
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
    }
  },

  addCancelLog: (payload) =>
    set((state) => ({
      cancelLogs: [createCancelLog(payload), ...state.cancelLogs],
    })),

  getByStatus: (status) => get().orders.filter((order) => order.status === status),
  resetOrderState: () =>
    set(() => ({
      orders: [],
      cancelLogs: [],
      isLoading: false,
      isOnline: true,
      pendingSyncCount: 0,
      initialized: false,
    })),
}));
