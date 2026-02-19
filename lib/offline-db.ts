/**
 * IndexedDB Wrapper for Offline Storage
 *
 * This module provides a Promise-based wrapper around IndexedDB for offline-first PWA functionality.
 * It manages the database connection and provides methods for CRUD operations on offline data stores.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  OfflineOrder,
  OfflineOrderItem,
  OfflineMenu,
  OfflineCategory,
  SyncQueueItem,
  OfflineStoreName,
} from '@/types/offline';

// ============================================================================
// Database Schema Definition
// ============================================================================

interface OfflineDB extends DBSchema {
  orders: {
    key: string;
    value: OfflineOrder;
    indexes: {
      'by-syncStatus': string;
      'by-localId': string;
      'by-createdAt': Date;
    };
  };
  orderItems: {
    key: string;
    value: OfflineOrderItem;
    indexes: {
      'by-orderId': string;
    };
  };
  menus: {
    key: string;
    value: OfflineMenu;
    indexes: {
      'by-categoryId': string;
      'by-availability': boolean;
      'by-version': number;
    };
  };
  categories: {
    key: string;
    value: OfflineCategory;
    indexes: {
      'by-order': number;
      'by-version': number;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-syncStatus': string;
      'by-entityType': string;
      'by-createdAt': Date;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: Date;
    };
  };
}

// ============================================================================
// Database Constants
// ============================================================================

const DB_NAME = 'point-on-sale-offline';
const DB_VERSION = 1;

// ============================================================================
// Global Database Instance (Singleton Pattern)
// ============================================================================

const globalForDB = globalThis as unknown as {
  offlineDB: IDBPDatabase<OfflineDB> | undefined;
};

// ============================================================================
// Database Initialization
// ============================================================================

async function createOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  const db = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const ordersStore = db.createObjectStore('orders', { keyPath: 'id' });
        ordersStore.createIndex('by-syncStatus', 'syncStatus');
        ordersStore.createIndex('by-localId', 'localId', { unique: true });
        ordersStore.createIndex('by-createdAt', 'createdAt');
      }

      // Order Items store
      if (!db.objectStoreNames.contains('orderItems')) {
        const orderItemsStore = db.createObjectStore('orderItems', { keyPath: 'id' });
        orderItemsStore.createIndex('by-orderId', 'orderId');
      }

      // Menus store
      if (!db.objectStoreNames.contains('menus')) {
        const menusStore = db.createObjectStore('menus', { keyPath: 'id' });
        menusStore.createIndex('by-categoryId', 'categoryId');
        menusStore.createIndex('by-availability', 'isAvailable');
        menusStore.createIndex('by-version', 'version');
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoriesStore.createIndex('by-order', 'order');
        categoriesStore.createIndex('by-version', 'version');
      }

      // Sync Queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncQueueStore.createIndex('by-syncStatus', 'syncStatus');
        syncQueueStore.createIndex('by-entityType', 'entityType');
        syncQueueStore.createIndex('by-createdAt', 'createdAt');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
    blocked() {
      console.warn('[OfflineDB] Database upgrade blocked by another connection');
    },
    blocking() {
      console.warn('[OfflineDB] This connection is blocking a database upgrade');
    },
  });

  return db;
}

// ============================================================================
// Database Instance Export
// ============================================================================

export const db = globalForDB.offlineDB ?? await createOfflineDB();

if (process.env.NODE_ENV !== 'production') {
  globalForDB.offlineDB = db;
}

export default db;

// ============================================================================
// Generic CRUD Operations
// ============================================================================

/**
 * Get a single item by key from a store
 */
export async function get<T>(
  storeName: OfflineStoreName,
  key: string
): Promise<T | undefined> {
  try {
    return await db.get(storeName, key);
  } catch (error) {
    console.error(`[OfflineDB] Error getting item from ${storeName}:`, error);
    throw error;
  }
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: OfflineStoreName): Promise<T[]> {
  try {
    return await db.getAll(storeName);
  } catch (error) {
    console.error(`[OfflineDB] Error getting all items from ${storeName}:`, error);
    throw error;
  }
}

/**
 * Get items from a store using an index
 */
export async function getAllFromIndex<T>(
  storeName: OfflineStoreName,
  indexName: string,
  indexValue: string | boolean | number
): Promise<T[]> {
  try {
    return await db.getAllFromIndex(storeName, indexName, indexValue);
  } catch (error) {
    console.error(
      `[OfflineDB] Error getting items from index ${indexName} in ${storeName}:`,
      error
    );
    throw error;
  }
}

/**
 * Add or update an item in a store
 */
export async function put<T>(
  storeName: OfflineStoreName,
  value: T
): Promise<string> {
  try {
    const key = await db.put(storeName, value);
    return key as string;
  } catch (error) {
    console.error(`[OfflineDB] Error putting item in ${storeName}:`, error);
    throw error;
  }
}

/**
 * Delete an item from a store
 */
export async function remove(
  storeName: OfflineStoreName,
  key: string
): Promise<void> {
  try {
    await db.delete(storeName, key);
  } catch (error) {
    console.error(`[OfflineDB] Error deleting item from ${storeName}:`, error);
    throw error;
  }
}

/**
 * Clear all items from a store
 */
export async function clear(storeName: OfflineStoreName): Promise<void> {
  try {
    await db.clear(storeName);
  } catch (error) {
    console.error(`[OfflineDB] Error clearing ${storeName}:`, error);
    throw error;
  }
}

/**
 * Count items in a store
 */
export async function count(storeName: OfflineStoreName): Promise<number> {
  try {
    return await db.count(storeName);
  } catch (error) {
    console.error(`[OfflineDB] Error counting items in ${storeName}:`, error);
    throw error;
  }
}

// ============================================================================
// Store-Specific Operations
// ============================================================================

/**
 * Orders Store Operations
 */
export const ordersDB = {
  add: async (order: OfflineOrder) => put('orders', order),
  get: async (id: string) => get<OfflineOrder>('orders', id),
  getAll: async () => getAll<OfflineOrder>('orders'),
  getByLocalId: async (localId: string) =>
    getAllFromIndex<OfflineOrder>('orders', 'by-localId', localId),
  getPendingSync: async () =>
    getAllFromIndex<OfflineOrder>('orders', 'by-syncStatus', 'pending'),
  update: async (order: OfflineOrder) => put('orders', order),
  delete: async (id: string) => remove('orders', id),
  clear: async () => clear('orders'),
  count: async () => count('orders'),
};

/**
 * Order Items Store Operations
 */
export const orderItemsDB = {
  add: async (item: OfflineOrderItem) => put('orderItems', item),
  get: async (id: string) => get<OfflineOrderItem>('orderItems', id),
  getByOrderId: async (orderId: string) =>
    getAllFromIndex<OfflineOrderItem>('orderItems', 'by-orderId', orderId),
  update: async (item: OfflineOrderItem) => put('orderItems', item),
  delete: async (id: string) => remove('orderItems', id),
  clear: async () => clear('orderItems'),
};

/**
 * Menus Store Operations
 */
export const menusDB = {
  add: async (menu: OfflineMenu) => put('menus', menu),
  addMany: async (menus: OfflineMenu[]) => {
    const tx = db.transaction('menus', 'readwrite');
    await Promise.all([
      ...menus.map((menu) => tx.store.put(menu)),
      tx.done,
    ]);
  },
  get: async (id: string) => get<OfflineMenu>('menus', id),
  getAll: async () => getAll<OfflineMenu>('menus'),
  getByCategory: async (categoryId: string) =>
    getAllFromIndex<OfflineMenu>('menus', 'by-categoryId', categoryId),
  getAvailable: async () =>
    getAllFromIndex<OfflineMenu>('menus', 'by-availability', true),
  update: async (menu: OfflineMenu) => put('menus', menu),
  delete: async (id: string) => remove('menus', id),
  clear: async () => clear('menus'),
  count: async () => count('menus'),
};

/**
 * Categories Store Operations
 */
export const categoriesDB = {
  add: async (category: OfflineCategory) => put('categories', category),
  addMany: async (categories: OfflineCategory[]) => {
    const tx = db.transaction('categories', 'readwrite');
    await Promise.all([
      ...categories.map((category) => tx.store.put(category)),
      tx.done,
    ]);
  },
  get: async (id: string) => get<OfflineCategory>('categories', id),
  getAll: async () => getAll<OfflineCategory>('categories'),
  update: async (category: OfflineCategory) => put('categories', category),
  delete: async (id: string) => remove('categories', id),
  clear: async () => clear('categories'),
  count: async () => count('categories'),
};

/**
 * Sync Queue Store Operations
 */
export const syncQueueDB = {
  add: async (item: SyncQueueItem) => put('syncQueue', item),
  get: async (id: string) => get<SyncQueueItem>('syncQueue', id),
  getAll: async () => getAll<SyncQueueItem>('syncQueue'),
  getPending: async () =>
    getAllFromIndex<SyncQueueItem>('syncQueue', 'by-syncStatus', 'pending'),
  getByEntityType: async (entityType: string) =>
    getAllFromIndex<SyncQueueItem>('syncQueue', 'by-entityType', entityType),
  update: async (item: SyncQueueItem) => put('syncQueue', item),
  delete: async (id: string) => remove('syncQueue', id),
  clear: async () => clear('syncQueue'),
  count: async () => count('syncQueue'),
};

/**
 * Settings Store Operations
 */
export const settingsDB = {
  get: async (key: string) => get<{ key: string; value: unknown; updatedAt: Date }>('settings', key),
  set: async (key: string, value: unknown) =>
    put('settings', { key, value, updatedAt: new Date() }),
  delete: async (key: string) => remove('settings', key),
  clear: async () => clear('settings'),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if IndexedDB is supported in the current browser
 */
export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/**
 * Close the database connection
 */
export async function closeDB(): Promise<void> {
  try {
    db.close();
    if (process.env.NODE_ENV !== 'production') {
      globalForDB.offlineDB = undefined;
    }
  } catch (error) {
    console.error('[OfflineDB] Error closing database:', error);
    throw error;
  }
}

/**
 * Delete the entire database (useful for testing or reset)
 */
export async function deleteDB(): Promise<void> {
  try {
    await closeDB();
    await indexedDB.deleteDatabase(DB_NAME);
  } catch (error) {
    console.error('[OfflineDB] Error deleting database:', error);
    throw error;
  }
}
