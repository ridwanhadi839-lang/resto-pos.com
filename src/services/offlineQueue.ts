import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateOrderInput, OrderStatus } from '../types';

const ORDER_QUEUE_KEY = 'restopos-offline-order-queue:v1';
const STATUS_QUEUE_KEY = 'restopos-offline-status-queue:v1';

export interface QueuedOrder {
  queueId: string;
  localOrderId: string;
  payload: CreateOrderInput;
}

export interface QueuedStatusUpdate {
  queueId: string;
  orderId: string;
  status: OrderStatus;
}

const safeParseQueue = (value: string | null): QueuedOrder[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as QueuedOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeParseStatusQueue = (value: string | null): QueuedStatusUpdate[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as QueuedStatusUpdate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getQueuedOrders = async (): Promise<QueuedOrder[]> => {
  const raw = await AsyncStorage.getItem(ORDER_QUEUE_KEY);
  return safeParseQueue(raw);
};

const saveQueuedOrders = async (queue: QueuedOrder[]) => {
  await AsyncStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue));
};

const saveQueuedStatusUpdates = async (queue: QueuedStatusUpdate[]) => {
  await AsyncStorage.setItem(STATUS_QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueOrder = async (item: QueuedOrder) => {
  const queue = await getQueuedOrders();
  queue.push(item);
  await saveQueuedOrders(queue);
  return queue.length;
};

export const removeQueuedOrder = async (queueId: string) => {
  const queue = await getQueuedOrders();
  const filtered = queue.filter((item) => item.queueId !== queueId);
  await saveQueuedOrders(filtered);
  return filtered.length;
};

export const replaceQueue = async (items: QueuedOrder[]) => {
  await saveQueuedOrders(items);
};

export const getQueuedStatusUpdates = async (): Promise<QueuedStatusUpdate[]> => {
  const raw = await AsyncStorage.getItem(STATUS_QUEUE_KEY);
  return safeParseStatusQueue(raw);
};

export const enqueueStatusUpdate = async (item: QueuedStatusUpdate) => {
  const queue = await getQueuedStatusUpdates();
  queue.push(item);
  await saveQueuedStatusUpdates(queue);
  return queue.length;
};

export const replaceStatusQueue = async (items: QueuedStatusUpdate[]) => {
  await saveQueuedStatusUpdates(items);
};

export const updateQueuedOrderStatus = async (
  localOrderId: string,
  status: OrderStatus
) => {
  const queue = await getQueuedOrders();
  const updated = queue.map((item) =>
    item.localOrderId === localOrderId
      ? { ...item, payload: { ...item.payload, status } }
      : item
  );
  await saveQueuedOrders(updated);
  return updated.length;
};
