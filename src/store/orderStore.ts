import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import {
  enqueueOrder,
  enqueueStatusUpdate,
  getQueuedOrders,
  getQueuedStatusUpdates,
  removeQueuedOrder,
  removeQueuedStatusUpdate,
  updateQueuedOrderStatus,
} from '../services/offlineQueue';
import {
  createOrder,
  fetchOrders,
  hasOrderRealtimeSync,
  hasRemoteOrderAccess,
  isRetryableRemoteError,
  subscribeOrdersRealtime,
  updateOrderStatus as updateOrderStatusRemote,
} from '../services/orderService';
import { CancelLog, CancelReason, CreateOrderInput, Order, OrderStatus } from '../types';
import { createCancelLog } from '../utils/cancelLog';

type SyncResult = {
  ok: boolean;
  pendingCount: number;
  syncedCount: number;
  error?: string;
};

interface OrderState {
  orders: Order[];
  cancelLogs: CancelLog[];
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncError: string | null;
  lastSyncedAt: string | null;
  initialized: boolean;
  initializeOrders: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  syncPendingOrders: () => Promise<SyncResult>;
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
let syncPromise: Promise<SyncResult> | null = null;

const calculatePendingCount = async () => {
  const [orderQueue, statusQueue] = await Promise.all([
    getQueuedOrders(),
    getQueuedStatusUpdates(),
  ]);
  return orderQueue.length + statusQueue.length;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Sync pending order gagal.';

const syncAllQueues = async (set: (fn: (state: OrderState) => Partial<OrderState>) => void) => {
  if (!hasRemoteOrderAccess) return 0;

  let syncedCount = 0;

  const queuedOrders = await getQueuedOrders();
  if (queuedOrders.length > 0) {
    for (const item of queuedOrders) {
      try {
        const created = await createOrder(item.payload);
        await removeQueuedOrder(item.queueId);
        syncedCount += 1;
        set((state) => ({
          orders: (() => {
            const hasLocalPlaceholder = state.orders.some((order) => order.id === item.localOrderId);
            if (!hasLocalPlaceholder) {
              return [created, ...state.orders];
            }

            return state.orders.map((order) =>
              order.id === item.localOrderId ? created : order
            );
          })(),
        }));
      } catch {
        // Leave failed items in SQLite so they can be retried manually or on the next reconnect.
      }
    }
  }

  const queuedStatuses = await getQueuedStatusUpdates();
  if (queuedStatuses.length > 0) {
    for (const item of queuedStatuses) {
      try {
        await updateOrderStatusRemote(item.orderId, item.status);
        await removeQueuedStatusUpdate(item.queueId);
        syncedCount += 1;
      } catch {
        // Leave failed status updates in SQLite so they can be retried later.
      }
    }
  }

  return syncedCount;
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  cancelLogs: [],
  isLoading: true,
  isOnline: true,
  isSyncing: false,
  pendingSyncCount: 0,
  lastSyncError: null,
  lastSyncedAt: null,
  initialized: false,

  initializeOrders: async () => {
    if (get().initialized) return;

    set(() => ({ isLoading: true }));

    const netState = await NetInfo.fetch();
    const online = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    set(() => ({ isOnline: online }));

    if (online && hasRemoteOrderAccess) {
      await get().syncPendingOrders();
    }

    const pendingCount = await calculatePendingCount();
    set(() => ({
      pendingSyncCount: pendingCount,
      isLoading: false,
      initialized: true,
    }));

    if (!netInfoUnsubscribe) {
      netInfoUnsubscribe = NetInfo.addEventListener(async (state) => {
        const nowOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
        set(() => ({ isOnline: nowOnline }));

        if (nowOnline && hasRemoteOrderAccess) {
          await get().syncPendingOrders();
          return;
        }

        const pendingCount = await calculatePendingCount();
        set(() => ({ pendingSyncCount: pendingCount }));
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

  syncPendingOrders: async () => {
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
      const netState = await NetInfo.fetch();
      const online = Boolean(netState.isConnected && netState.isInternetReachable !== false);
      set(() => ({ isOnline: online }));

      if (!online) {
        const pendingCount = await calculatePendingCount();
        const error = pendingCount > 0 ? 'Masih offline. Pending order belum bisa dikirim.' : undefined;
        set(() => ({
          pendingSyncCount: pendingCount,
          lastSyncError: error ?? null,
        }));
        syncPromise = null;
        return {
          ok: pendingCount === 0,
          pendingCount,
          syncedCount: 0,
          error,
        };
      }

      if (!hasRemoteOrderAccess) {
        const pendingCount = await calculatePendingCount();
        const error = 'Backend Express belum dikonfigurasi, sync ke Supabase belum tersedia.';
        set(() => ({
          pendingSyncCount: pendingCount,
          lastSyncError: pendingCount > 0 ? error : null,
        }));
        syncPromise = null;
        return {
          ok: pendingCount === 0,
          pendingCount,
          syncedCount: 0,
          error: pendingCount > 0 ? error : undefined,
        };
      }

      set(() => ({ isSyncing: true, lastSyncError: null }));

      try {
        const syncedCount = await syncAllQueues(set);
        const pendingCount = await calculatePendingCount();
        const error =
          pendingCount > 0
            ? 'Sebagian pending order belum terkirim. Coba lagi saat koneksi stabil.'
            : undefined;

        set(() => ({
          pendingSyncCount: pendingCount,
          lastSyncError: error ?? null,
          lastSyncedAt: pendingCount === 0 ? new Date().toISOString() : get().lastSyncedAt,
        }));

        return {
          ok: pendingCount === 0,
          pendingCount,
          syncedCount,
          error,
        };
      } catch (error) {
        const pendingCount = await calculatePendingCount();
        const message = getErrorMessage(error);
        set(() => ({
          pendingSyncCount: pendingCount,
          lastSyncError: message,
        }));
        return {
          ok: false,
          pendingCount,
          syncedCount: 0,
          error: message,
        };
      } finally {
        set(() => ({ isSyncing: false }));
        syncPromise = null;
      }
    })();

    return syncPromise;
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
      set(() => ({
        pendingSyncCount: pendingCount,
        lastSyncError: 'Order disimpan offline. Akan dikirim saat koneksi kembali stabil.',
      }));
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
    } catch (error) {
      if (!isRetryableRemoteError(error)) {
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== optimisticOrder.id),
        }));
        throw error;
      }

      const queueId = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await enqueueOrder({ queueId, localOrderId, payload: orderInput });
      const pendingCount = await calculatePendingCount();
      set(() => ({
        pendingSyncCount: pendingCount,
        lastSyncError: 'Order disimpan offline. Akan dikirim saat koneksi kembali stabil.',
      }));
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
      set(() => ({
        pendingSyncCount: pendingCount,
        lastSyncError: 'Status order disimpan offline. Akan dikirim saat koneksi kembali stabil.',
      }));
      return;
    }

    try {
      await updateOrderStatusRemote(orderId, status);
      const pendingCount = await calculatePendingCount();
      set(() => ({ pendingSyncCount: pendingCount }));
    } catch (error) {
      if (!isRetryableRemoteError(error)) {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: target.status,
                  synced: target.synced,
                }
              : order
          ),
        }));
        throw error;
      }

      const queueId = `status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await enqueueStatusUpdate({ queueId, orderId, status });
      const pendingCount = await calculatePendingCount();
      set(() => ({
        pendingSyncCount: pendingCount,
        lastSyncError: 'Status order disimpan offline. Akan dikirim saat koneksi kembali stabil.',
      }));
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
      isSyncing: false,
      pendingSyncCount: 0,
      lastSyncError: null,
      lastSyncedAt: null,
      initialized: false,
    })),
}));
