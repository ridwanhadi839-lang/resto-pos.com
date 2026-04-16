import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { CreateOrderInput, OrderStatus } from '../types';

const ORDER_QUEUE_KEY = 'restopos-offline-order-queue:v1';
const STATUS_QUEUE_KEY = 'restopos-offline-status-queue:v1';
const DATABASE_NAME = 'restopos-offline.db';

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

type OrderQueueRow = {
  queue_id: string;
  local_order_id: string;
  payload_json: string;
};

type StatusQueueRow = {
  queue_id: string;
  order_id: string;
  status: OrderStatus;
};

let databasePromise: Promise<SQLiteDatabase | null> | null = null;
let migrationPromise: Promise<void> | null = null;

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

const safeParseOrderPayload = (value: string): CreateOrderInput | null => {
  try {
    return JSON.parse(value) as CreateOrderInput;
  } catch {
    return null;
  }
};

const getDatabase = async () => {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!databasePromise) {
    databasePromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS offline_order_queue (
            queue_id TEXT PRIMARY KEY NOT NULL,
            local_order_id TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS offline_status_queue (
            queue_id TEXT PRIMARY KEY NOT NULL,
            order_id TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_offline_order_queue_created_at
            ON offline_order_queue(created_at);
          CREATE INDEX IF NOT EXISTS idx_offline_status_queue_created_at
            ON offline_status_queue(created_at);
        `);
        return db;
      } catch {
        return null;
      }
    })();
  }

  return databasePromise;
};

const migrateLegacyAsyncStorageQueue = async (db: SQLiteDatabase) => {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const [rawOrders, rawStatuses] = await Promise.all([
        AsyncStorage.getItem(ORDER_QUEUE_KEY),
        AsyncStorage.getItem(STATUS_QUEUE_KEY),
      ]);
      const orders = safeParseQueue(rawOrders);
      const statuses = safeParseStatusQueue(rawStatuses);

      if (orders.length === 0 && statuses.length === 0) {
        return;
      }

      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const item of orders) {
          await txn.runAsync(
            `
              INSERT OR IGNORE INTO offline_order_queue
                (queue_id, local_order_id, payload_json)
              VALUES (?, ?, ?)
            `,
            item.queueId,
            item.localOrderId,
            JSON.stringify(item.payload)
          );
        }

        for (const item of statuses) {
          await txn.runAsync(
            `
              INSERT OR IGNORE INTO offline_status_queue
                (queue_id, order_id, status)
              VALUES (?, ?, ?)
            `,
            item.queueId,
            item.orderId,
            item.status
          );
        }
      });

      await Promise.all([
        AsyncStorage.removeItem(ORDER_QUEUE_KEY),
        AsyncStorage.removeItem(STATUS_QUEUE_KEY),
      ]);
    })();
  }

  return migrationPromise;
};

const getReadyDatabase = async () => {
  const db = await getDatabase();
  if (!db) return null;

  await migrateLegacyAsyncStorageQueue(db);
  return db;
};

export const initializeOfflineQueueStorage = async () => {
  await getReadyDatabase();
};

const getQueuedOrdersFromAsyncStorage = async (): Promise<QueuedOrder[]> => {
  const raw = await AsyncStorage.getItem(ORDER_QUEUE_KEY);
  return safeParseQueue(raw);
};

const saveQueuedOrdersToAsyncStorage = async (queue: QueuedOrder[]) => {
  await AsyncStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue));
};

const getQueuedStatusUpdatesFromAsyncStorage = async (): Promise<QueuedStatusUpdate[]> => {
  const raw = await AsyncStorage.getItem(STATUS_QUEUE_KEY);
  return safeParseStatusQueue(raw);
};

const saveQueuedStatusUpdatesToAsyncStorage = async (queue: QueuedStatusUpdate[]) => {
  await AsyncStorage.setItem(STATUS_QUEUE_KEY, JSON.stringify(queue));
};

export const getQueuedOrders = async (): Promise<QueuedOrder[]> => {
  const db = await getReadyDatabase();
  if (!db) {
    return getQueuedOrdersFromAsyncStorage();
  }

  const rows = await db.getAllAsync<OrderQueueRow>(
    `
      SELECT queue_id, local_order_id, payload_json
      FROM offline_order_queue
      ORDER BY created_at ASC
    `
  );

  return rows.reduce<QueuedOrder[]>((items, row) => {
    const payload = safeParseOrderPayload(row.payload_json);
    if (!payload) return items;

    items.push({
      queueId: row.queue_id,
      localOrderId: row.local_order_id,
      payload,
    });
    return items;
  }, []);
};

export const enqueueOrder = async (item: QueuedOrder) => {
  const db = await getReadyDatabase();
  if (!db) {
    const queue = await getQueuedOrdersFromAsyncStorage();
    queue.push(item);
    await saveQueuedOrdersToAsyncStorage(queue);
    return queue.length;
  }

  await db.runAsync(
    `
      INSERT OR REPLACE INTO offline_order_queue
        (queue_id, local_order_id, payload_json)
      VALUES (?, ?, ?)
    `,
    item.queueId,
    item.localOrderId,
    JSON.stringify(item.payload)
  );

  return (await getQueuedOrders()).length;
};

export const removeQueuedOrder = async (queueId: string) => {
  const db = await getReadyDatabase();
  if (!db) {
    const queue = await getQueuedOrdersFromAsyncStorage();
    const filtered = queue.filter((item) => item.queueId !== queueId);
    await saveQueuedOrdersToAsyncStorage(filtered);
    return filtered.length;
  }

  await db.runAsync('DELETE FROM offline_order_queue WHERE queue_id = ?', queueId);
  return (await getQueuedOrders()).length;
};

export const replaceQueue = async (items: QueuedOrder[]) => {
  const db = await getReadyDatabase();
  if (!db) {
    await saveQueuedOrdersToAsyncStorage(items);
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM offline_order_queue');
    for (const item of items) {
      await txn.runAsync(
        `
          INSERT INTO offline_order_queue
            (queue_id, local_order_id, payload_json)
          VALUES (?, ?, ?)
        `,
        item.queueId,
        item.localOrderId,
        JSON.stringify(item.payload)
      );
    }
  });
};

export const getQueuedStatusUpdates = async (): Promise<QueuedStatusUpdate[]> => {
  const db = await getReadyDatabase();
  if (!db) {
    return getQueuedStatusUpdatesFromAsyncStorage();
  }

  const rows = await db.getAllAsync<StatusQueueRow>(
    `
      SELECT queue_id, order_id, status
      FROM offline_status_queue
      ORDER BY created_at ASC
    `
  );

  return rows.map((row) => ({
    queueId: row.queue_id,
    orderId: row.order_id,
    status: row.status,
  }));
};

export const enqueueStatusUpdate = async (item: QueuedStatusUpdate) => {
  const db = await getReadyDatabase();
  if (!db) {
    const queue = await getQueuedStatusUpdatesFromAsyncStorage();
    queue.push(item);
    await saveQueuedStatusUpdatesToAsyncStorage(queue);
    return queue.length;
  }

  await db.runAsync(
    `
      INSERT OR REPLACE INTO offline_status_queue
        (queue_id, order_id, status)
      VALUES (?, ?, ?)
    `,
    item.queueId,
    item.orderId,
    item.status
  );

  return (await getQueuedStatusUpdates()).length;
};

export const removeQueuedStatusUpdate = async (queueId: string) => {
  const db = await getReadyDatabase();
  if (!db) {
    const queue = await getQueuedStatusUpdatesFromAsyncStorage();
    const filtered = queue.filter((item) => item.queueId !== queueId);
    await saveQueuedStatusUpdatesToAsyncStorage(filtered);
    return filtered.length;
  }

  await db.runAsync('DELETE FROM offline_status_queue WHERE queue_id = ?', queueId);
  return (await getQueuedStatusUpdates()).length;
};

export const replaceStatusQueue = async (items: QueuedStatusUpdate[]) => {
  const db = await getReadyDatabase();
  if (!db) {
    await saveQueuedStatusUpdatesToAsyncStorage(items);
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM offline_status_queue');
    for (const item of items) {
      await txn.runAsync(
        `
          INSERT INTO offline_status_queue
            (queue_id, order_id, status)
          VALUES (?, ?, ?)
        `,
        item.queueId,
        item.orderId,
        item.status
      );
    }
  });
};

export const updateQueuedOrderStatus = async (
  localOrderId: string,
  status: OrderStatus
) => {
  const db = await getReadyDatabase();
  if (!db) {
    const queue = await getQueuedOrdersFromAsyncStorage();
    const updated = queue.map((item) =>
      item.localOrderId === localOrderId
        ? { ...item, payload: { ...item.payload, status } }
        : item
    );
    await saveQueuedOrdersToAsyncStorage(updated);
    return updated.length;
  }

  const rows = await db.getAllAsync<OrderQueueRow>(
    `
      SELECT queue_id, local_order_id, payload_json
      FROM offline_order_queue
      WHERE local_order_id = ?
    `,
    localOrderId
  );

  for (const row of rows) {
    const payload = safeParseOrderPayload(row.payload_json);
    if (!payload) continue;

    await db.runAsync(
      'UPDATE offline_order_queue SET payload_json = ? WHERE queue_id = ?',
      JSON.stringify({ ...payload, status }),
      row.queue_id
    );
  }

  return (await getQueuedOrders()).length;
};
