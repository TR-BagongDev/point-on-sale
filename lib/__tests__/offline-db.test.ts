/**
 * Unit Tests for Offline Database Operations
 *
 * These tests cover the IndexedDB wrapper functionality including:
 * - Generic CRUD operations
 * - Store-specific operations (orders, orderItems, menus, categories, syncQueue, settings)
 * - Utility functions
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the idb module BEFORE importing offline-db
// The mock factory is hoisted and runs before other code
vi.mock('idb', () => {
  const mockDB = {
    get: vi.fn(),
    getAll: vi.fn(),
    getAllFromIndex: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
    close: vi.fn(),
    transaction: vi.fn(() => ({
      store: { put: vi.fn() },
      done: Promise.resolve(),
    })),
  };

  // Store on global for access in tests
  (globalThis as any).__mockDB = mockDB;

  return {
    openDB: vi.fn(() => Promise.resolve(mockDB)),
  };
});

// Import after mocking
import {
  get,
  getAll,
  getAllFromIndex,
  put,
  remove,
  clear,
  count,
  ordersDB,
  orderItemsDB,
  menusDB,
  categoriesDB,
  syncQueueDB,
  settingsDB,
  closeDB,
  deleteDB,
  isIndexedDBSupported,
} from '../offline-db';
import type {
  OfflineOrder,
  OfflineOrderItem,
  OfflineMenu,
  OfflineCategory,
  SyncQueueItem,
} from '@/types/offline';

// Get the mock from global
const mockDB = (globalThis as any).__mockDB;

describe('offline-db - Utility Functions', () => {
  describe('isIndexedDBSupported', () => {
    it('should return true when IndexedDB is available', () => {
      const result = isIndexedDBSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('closeDB', () => {
    it('should close the database connection', async () => {
      await closeDB();
      expect(mockDB.close).toHaveBeenCalled();
    });

    it('should handle errors when closing database', async () => {
      mockDB.close.mockImplementationOnce(() => {
        throw new Error('Close error');
      });

      await expect(closeDB()).rejects.toThrow('Close error');
    });
  });

  describe('deleteDB', () => {
    it('should delete the database', async () => {
      // Mock indexedDB if it doesn't exist
      if (!global.indexedDB) {
        (global as any).indexedDB = {};
      }

      const mockDeleteDatabase = vi.fn();
      global.indexedDB.deleteDatabase = mockDeleteDatabase as any;

      await deleteDB();

      expect(mockDB.close).toHaveBeenCalled();
      expect(mockDeleteDatabase).toHaveBeenCalledWith('point-on-sale-offline');
    });

    it('should handle errors when deleting database', async () => {
      mockDB.close.mockImplementationOnce(() => {
        throw new Error('Delete error');
      });

      await expect(deleteDB()).rejects.toThrow('Delete error');
    });
  });
});

describe('offline-db - Generic CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve a single item by key from a store', async () => {
      const mockOrder: OfflineOrder = {
        id: 'test-id',
        orderNumber: 'ORD-001',
        userId: 'user-1',
        subtotal: 10000,
        tax: 1000,
        discount: 0,
        total: 11000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'synced',
        syncedAt: new Date(),
        localId: 'local-1',
        retryCount: 0,
        lastSyncAttempt: null,
        conflictReason: null,
      };

      mockDB.get.mockResolvedValue(mockOrder);

      const result = await get<OfflineOrder>('orders', 'test-id');

      expect(mockDB.get).toHaveBeenCalledWith('orders', 'test-id');
      expect(result).toEqual(mockOrder);
    });

    it('should return undefined for non-existent item', async () => {
      mockDB.get.mockResolvedValue(undefined);

      const result = await get<OfflineOrder>('orders', 'non-existent');

      expect(result).toBeUndefined();
    });

    it('should handle errors and rethrow them', async () => {
      mockDB.get.mockRejectedValue(new Error('Database error'));

      await expect(get('orders', 'test-id')).rejects.toThrow('Database error');
    });
  });

  describe('getAll', () => {
    it('should retrieve all items from a store', async () => {
      const mockOrders: OfflineOrder[] = [
        {
          id: 'test-id-1',
          orderNumber: 'ORD-001',
          userId: 'user-1',
          subtotal: 10000,
          tax: 1000,
          discount: 0,
          total: 11000,
          paymentMethod: 'CASH',
          status: 'PENDING',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'synced',
          syncedAt: new Date(),
          localId: 'local-1',
          retryCount: 0,
          lastSyncAttempt: null,
          conflictReason: null,
        },
        {
          id: 'test-id-2',
          orderNumber: 'ORD-002',
          userId: 'user-2',
          subtotal: 20000,
          tax: 2000,
          discount: 0,
          total: 22000,
          paymentMethod: 'CARD',
          status: 'COMPLETED',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'synced',
          syncedAt: new Date(),
          localId: 'local-2',
          retryCount: 0,
          lastSyncAttempt: null,
          conflictReason: null,
        },
      ];

      mockDB.getAll.mockResolvedValue(mockOrders);

      const result = await getAll<OfflineOrder>('orders');

      expect(mockDB.getAll).toHaveBeenCalledWith('orders');
      expect(result).toEqual(mockOrders);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when store is empty', async () => {
      mockDB.getAll.mockResolvedValue([]);

      const result = await getAll<OfflineOrder>('orders');

      expect(result).toEqual([]);
    });

    it('should handle errors and rethrow them', async () => {
      mockDB.getAll.mockRejectedValue(new Error('Database error'));

      await expect(getAll('orders')).rejects.toThrow('Database error');
    });
  });

  describe('getAllFromIndex', () => {
    it('should retrieve items using an index', async () => {
      const mockPendingOrders: OfflineOrder[] = [
        {
          id: 'test-id-1',
          orderNumber: 'ORD-001',
          userId: 'user-1',
          subtotal: 10000,
          tax: 1000,
          discount: 0,
          total: 11000,
          paymentMethod: 'CASH',
          status: 'PENDING',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
          syncedAt: null,
          localId: 'local-1',
          retryCount: 0,
          lastSyncAttempt: null,
          conflictReason: null,
        },
      ];

      mockDB.getAllFromIndex.mockResolvedValue(mockPendingOrders);

      const result = await getAllFromIndex<OfflineOrder>('orders', 'by-syncStatus', 'pending');

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('orders', 'by-syncStatus', 'pending');
      expect(result).toEqual(mockPendingOrders);
    });

    it('should work with boolean index values', async () => {
      const mockAvailableMenus: OfflineMenu[] = [
        {
          id: 'menu-1',
          name: 'Coffee',
          description: 'Fresh coffee',
          price: 15000,
          image: null,
          categoryId: 'cat-1',
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          cachedAt: new Date(),
          version: 1,
        },
      ];

      mockDB.getAllFromIndex.mockResolvedValue(mockAvailableMenus);

      const result = await getAllFromIndex<OfflineMenu>('menus', 'by-availability', true);

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('menus', 'by-availability', true);
      expect(result).toEqual(mockAvailableMenus);
    });

    it('should work with number index values', async () => {
      const mockCategories: OfflineCategory[] = [
        {
          id: 'cat-1',
          name: 'Beverages',
          icon: '🥤',
          color: '#FF0000',
          order: 1,
          cachedAt: new Date(),
          version: 1,
        },
      ];

      mockDB.getAllFromIndex.mockResolvedValue(mockCategories);

      const result = await getAllFromIndex<OfflineCategory>('categories', 'by-order', 1);

      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('categories', 'by-order', 1);
      expect(result).toEqual(mockCategories);
    });

    it('should handle errors and rethrow them', async () => {
      mockDB.getAllFromIndex.mockRejectedValue(new Error('Index error'));

      await expect(getAllFromIndex('orders', 'by-syncStatus', 'pending')).rejects.toThrow(
        'Index error'
      );
    });
  });

  describe('put', () => {
    it('should add or update an item in a store', async () => {
      const mockOrder: OfflineOrder = {
        id: 'test-id',
        orderNumber: 'ORD-001',
        userId: 'user-1',
        subtotal: 10000,
        tax: 1000,
        discount: 0,
        total: 11000,
        paymentMethod: 'CASH',
        status: 'PENDING',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        syncedAt: null,
        localId: 'local-1',
        retryCount: 0,
        lastSyncAttempt: null,
        conflictReason: null,
      };

      mockDB.put.mockResolvedValue('test-id');

      const result = await put('orders', mockOrder);

      expect(mockDB.put).toHaveBeenCalledWith('orders', mockOrder);
      expect(result).toBe('test-id');
    });

    it('should handle errors and rethrow them', async () => {
      const mockOrder = {} as OfflineOrder;
      mockDB.put.mockRejectedValue(new Error('Put error'));

      await expect(put('orders', mockOrder)).rejects.toThrow('Put error');
    });
  });

  describe('remove', () => {
    it('should delete an item from a store', async () => {
      mockDB.delete.mockResolvedValue(undefined);

      await remove('orders', 'test-id');

      expect(mockDB.delete).toHaveBeenCalledWith('orders', 'test-id');
    });

    it('should handle errors and rethrow them', async () => {
      mockDB.delete.mockRejectedValue(new Error('Delete error'));

      await expect(remove('orders', 'test-id')).rejects.toThrow('Delete error');
    });
  });

  describe('clear', () => {
    it('should clear all items from a store', async () => {
      mockDB.clear.mockResolvedValue(undefined);

      await clear('orders');

      expect(mockDB.clear).toHaveBeenCalledWith('orders');
    });

    it('should handle errors and rethrow them', async () => {
      mockDB.clear.mockRejectedValue(new Error('Clear error'));

      await expect(clear('orders')).rejects.toThrow('Clear error');
    });
  });

  describe('count', () => {
    it('should count items in a store', async () => {
      mockDB.count.mockResolvedValue(5);

      const result = await count('orders');

      expect(mockDB.count).toHaveBeenCalledWith('orders');
      expect(result).toBe(5);
    });

    it('should return 0 for empty store', async () => {
      mockDB.count.mockResolvedValue(0);

      const result = await count('orders');

      expect(result).toBe(0);
    });

    it('should handle errors and rethrow them', async () => {
      mockDB.count.mockRejectedValue(new Error('Count error'));

      await expect(count('orders')).rejects.toThrow('Count error');
    });
  });
});

describe('offline-db - Orders Store Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add an order', async () => {
    const mockOrder = {} as OfflineOrder;
    mockDB.put.mockResolvedValue('test-id');

    await ordersDB.add(mockOrder);

    expect(mockDB.put).toHaveBeenCalledWith('orders', mockOrder);
  });

  it('should get an order by ID', async () => {
    const mockOrder = {} as OfflineOrder;
    mockDB.get.mockResolvedValue(mockOrder);

    const result = await ordersDB.get('test-id');

    expect(mockDB.get).toHaveBeenCalledWith('orders', 'test-id');
    expect(result).toEqual(mockOrder);
  });

  it('should get all orders', async () => {
    const mockOrders = [] as OfflineOrder[];
    mockDB.getAll.mockResolvedValue(mockOrders);

    const result = await ordersDB.getAll();

    expect(mockDB.getAll).toHaveBeenCalledWith('orders');
    expect(result).toEqual(mockOrders);
  });

  it('should get orders by local ID', async () => {
    const mockOrders = [] as OfflineOrder[];
    mockDB.getAllFromIndex.mockResolvedValue(mockOrders);

    const result = await ordersDB.getByLocalId('local-1');

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('orders', 'by-localId', 'local-1');
    expect(result).toEqual(mockOrders);
  });

  it('should get pending sync orders', async () => {
    const mockOrders = [] as OfflineOrder[];
    mockDB.getAllFromIndex.mockResolvedValue(mockOrders);

    const result = await ordersDB.getPendingSync();

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('orders', 'by-syncStatus', 'pending');
    expect(result).toEqual(mockOrders);
  });

  it('should update an order', async () => {
    const mockOrder = {} as OfflineOrder;
    mockDB.put.mockResolvedValue('test-id');

    await ordersDB.update(mockOrder);

    expect(mockDB.put).toHaveBeenCalledWith('orders', mockOrder);
  });

  it('should delete an order', async () => {
    mockDB.delete.mockResolvedValue(undefined);

    await ordersDB.delete('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('orders', 'test-id');
  });

  it('should clear all orders', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await ordersDB.clear();

    expect(mockDB.clear).toHaveBeenCalledWith('orders');
  });

  it('should count orders', async () => {
    mockDB.count.mockResolvedValue(10);

    const result = await ordersDB.count();

    expect(mockDB.count).toHaveBeenCalledWith('orders');
    expect(result).toBe(10);
  });
});

describe('offline-db - Order Items Store Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add an order item', async () => {
    const mockItem = {} as OfflineOrderItem;
    mockDB.put.mockResolvedValue('test-id');

    await orderItemsDB.add(mockItem);

    expect(mockDB.put).toHaveBeenCalledWith('orderItems', mockItem);
  });

  it('should get an order item by ID', async () => {
    const mockItem = {} as OfflineOrderItem;
    mockDB.get.mockResolvedValue(mockItem);

    const result = await orderItemsDB.get('test-id');

    expect(mockDB.get).toHaveBeenCalledWith('orderItems', 'test-id');
    expect(result).toEqual(mockItem);
  });

  it('should get order items by order ID', async () => {
    const mockItems = [] as OfflineOrderItem[];
    mockDB.getAllFromIndex.mockResolvedValue(mockItems);

    const result = await orderItemsDB.getByOrderId('order-1');

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('orderItems', 'by-orderId', 'order-1');
    expect(result).toEqual(mockItems);
  });

  it('should update an order item', async () => {
    const mockItem = {} as OfflineOrderItem;
    mockDB.put.mockResolvedValue('test-id');

    await orderItemsDB.update(mockItem);

    expect(mockDB.put).toHaveBeenCalledWith('orderItems', mockItem);
  });

  it('should delete an order item', async () => {
    mockDB.delete.mockResolvedValue(undefined);

    await orderItemsDB.delete('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('orderItems', 'test-id');
  });

  it('should clear all order items', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await orderItemsDB.clear();

    expect(mockDB.clear).toHaveBeenCalledWith('orderItems');
  });
});

describe('offline-db - Menus Store Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a menu', async () => {
    const mockMenu = {} as OfflineMenu;
    mockDB.put.mockResolvedValue('test-id');

    await menusDB.add(mockMenu);

    expect(mockDB.put).toHaveBeenCalledWith('menus', mockMenu);
  });

  it('should add multiple menus', async () => {
    const mockMenus = [{} as OfflineMenu, {} as OfflineMenu];

    await menusDB.addMany(mockMenus);

    expect(mockDB.transaction).toHaveBeenCalledWith('menus', 'readwrite');
  });

  it('should cache menus', async () => {
    const mockMenus = [{} as OfflineMenu];

    await menusDB.cacheMenus(mockMenus);

    expect(mockDB.transaction).toHaveBeenCalledWith('menus', 'readwrite');
  });

  it('should get a menu by ID', async () => {
    const mockMenu = {} as OfflineMenu;
    mockDB.get.mockResolvedValue(mockMenu);

    const result = await menusDB.get('test-id');

    expect(mockDB.get).toHaveBeenCalledWith('menus', 'test-id');
    expect(result).toEqual(mockMenu);
  });

  it('should get all menus', async () => {
    const mockMenus = [] as OfflineMenu[];
    mockDB.getAll.mockResolvedValue(mockMenus);

    const result = await menusDB.getAll();

    expect(mockDB.getAll).toHaveBeenCalledWith('menus');
    expect(result).toEqual(mockMenus);
  });

  it('should get menus from cache', async () => {
    const mockMenus = [] as OfflineMenu[];
    mockDB.getAll.mockResolvedValue(mockMenus);

    const result = await menusDB.getMenus();

    expect(mockDB.getAll).toHaveBeenCalledWith('menus');
    expect(result).toEqual(mockMenus);
  });

  it('should get menus by category', async () => {
    const mockMenus = [] as OfflineMenu[];
    mockDB.getAllFromIndex.mockResolvedValue(mockMenus);

    const result = await menusDB.getByCategory('cat-1');

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('menus', 'by-categoryId', 'cat-1');
    expect(result).toEqual(mockMenus);
  });

  it('should get available menus', async () => {
    const mockMenus = [] as OfflineMenu[];
    mockDB.getAllFromIndex.mockResolvedValue(mockMenus);

    const result = await menusDB.getAvailable();

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('menus', 'by-availability', true);
    expect(result).toEqual(mockMenus);
  });

  it('should update a menu', async () => {
    const mockMenu = {} as OfflineMenu;
    mockDB.put.mockResolvedValue('test-id');

    await menusDB.update(mockMenu);

    expect(mockDB.put).toHaveBeenCalledWith('menus', mockMenu);
  });

  it('should delete a menu', async () => {
    mockDB.delete.mockResolvedValue(undefined);

    await menusDB.delete('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('menus', 'test-id');
  });

  it('should clear all menus', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await menusDB.clear();

    expect(mockDB.clear).toHaveBeenCalledWith('menus');
  });

  it('should clear menu cache', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await menusDB.clearMenus();

    expect(mockDB.clear).toHaveBeenCalledWith('menus');
  });

  it('should count menus', async () => {
    mockDB.count.mockResolvedValue(15);

    const result = await menusDB.count();

    expect(mockDB.count).toHaveBeenCalledWith('menus');
    expect(result).toBe(15);
  });
});

describe('offline-db - Categories Store Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a category', async () => {
    const mockCategory = {} as OfflineCategory;
    mockDB.put.mockResolvedValue('test-id');

    await categoriesDB.add(mockCategory);

    expect(mockDB.put).toHaveBeenCalledWith('categories', mockCategory);
  });

  it('should add multiple categories', async () => {
    const mockCategories = [{} as OfflineCategory, {} as OfflineCategory];

    await categoriesDB.addMany(mockCategories);

    expect(mockDB.transaction).toHaveBeenCalledWith('categories', 'readwrite');
  });

  it('should get a category by ID', async () => {
    const mockCategory = {} as OfflineCategory;
    mockDB.get.mockResolvedValue(mockCategory);

    const result = await categoriesDB.get('test-id');

    expect(mockDB.get).toHaveBeenCalledWith('categories', 'test-id');
    expect(result).toEqual(mockCategory);
  });

  it('should get all categories', async () => {
    const mockCategories = [] as OfflineCategory[];
    mockDB.getAll.mockResolvedValue(mockCategories);

    const result = await categoriesDB.getAll();

    expect(mockDB.getAll).toHaveBeenCalledWith('categories');
    expect(result).toEqual(mockCategories);
  });

  it('should update a category', async () => {
    const mockCategory = {} as OfflineCategory;
    mockDB.put.mockResolvedValue('test-id');

    await categoriesDB.update(mockCategory);

    expect(mockDB.put).toHaveBeenCalledWith('categories', mockCategory);
  });

  it('should delete a category', async () => {
    mockDB.delete.mockResolvedValue(undefined);

    await categoriesDB.delete('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('categories', 'test-id');
  });

  it('should clear all categories', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await categoriesDB.clear();

    expect(mockDB.clear).toHaveBeenCalledWith('categories');
  });

  it('should count categories', async () => {
    mockDB.count.mockResolvedValue(5);

    const result = await categoriesDB.count();

    expect(mockDB.count).toHaveBeenCalledWith('categories');
    expect(result).toBe(5);
  });
});

describe('offline-db - Sync Queue Store Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a sync queue item', async () => {
    const mockItem = {} as SyncQueueItem;
    mockDB.put.mockResolvedValue('test-id');

    await syncQueueDB.add(mockItem);

    expect(mockDB.put).toHaveBeenCalledWith('syncQueue', mockItem);
  });

  it('should get a sync queue item by ID', async () => {
    const mockItem = {} as SyncQueueItem;
    mockDB.get.mockResolvedValue(mockItem);

    const result = await syncQueueDB.get('test-id');

    expect(mockDB.get).toHaveBeenCalledWith('syncQueue', 'test-id');
    expect(result).toEqual(mockItem);
  });

  it('should get all sync queue items', async () => {
    const mockItems = [] as SyncQueueItem[];
    mockDB.getAll.mockResolvedValue(mockItems);

    const result = await syncQueueDB.getAll();

    expect(mockDB.getAll).toHaveBeenCalledWith('syncQueue');
    expect(result).toEqual(mockItems);
  });

  it('should get pending sync items', async () => {
    const mockItems = [] as SyncQueueItem[];
    mockDB.getAllFromIndex.mockResolvedValue(mockItems);

    const result = await syncQueueDB.getPending();

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('syncQueue', 'by-syncStatus', 'pending');
    expect(result).toEqual(mockItems);
  });

  it('should get sync items by entity type', async () => {
    const mockItems = [] as SyncQueueItem[];
    mockDB.getAllFromIndex.mockResolvedValue(mockItems);

    const result = await syncQueueDB.getByEntityType('ORDER');

    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('syncQueue', 'by-entityType', 'ORDER');
    expect(result).toEqual(mockItems);
  });

  it('should update a sync queue item', async () => {
    const mockItem = {} as SyncQueueItem;
    mockDB.put.mockResolvedValue('test-id');

    await syncQueueDB.update(mockItem);

    expect(mockDB.put).toHaveBeenCalledWith('syncQueue', mockItem);
  });

  it('should delete a sync queue item', async () => {
    mockDB.delete.mockResolvedValue(undefined);

    await syncQueueDB.delete('test-id');

    expect(mockDB.delete).toHaveBeenCalledWith('syncQueue', 'test-id');
  });

  it('should clear all sync queue items', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await syncQueueDB.clear();

    expect(mockDB.clear).toHaveBeenCalledWith('syncQueue');
  });

  it('should count sync queue items', async () => {
    mockDB.count.mockResolvedValue(3);

    const result = await syncQueueDB.count();

    expect(mockDB.count).toHaveBeenCalledWith('syncQueue');
    expect(result).toBe(3);
  });
});

describe('offline-db - Settings Store Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get a setting by key', async () => {
    const mockSetting = {
      key: 'test-key',
      value: 'test-value',
      updatedAt: new Date(),
    };
    mockDB.get.mockResolvedValue(mockSetting);

    const result = await settingsDB.get('test-key');

    expect(mockDB.get).toHaveBeenCalledWith('settings', 'test-key');
    expect(result).toEqual(mockSetting);
  });

  it('should set a setting', async () => {
    mockDB.put.mockResolvedValue('test-key');

    await settingsDB.set('test-key', 'test-value');

    expect(mockDB.put).toHaveBeenCalledWith('settings', {
      key: 'test-key',
      value: 'test-value',
      updatedAt: expect.any(Date),
    });
  });

  it('should set a setting with complex value', async () => {
    const complexValue = { nested: { data: [1, 2, 3] } };
    mockDB.put.mockResolvedValue('test-key');

    await settingsDB.set('test-key', complexValue);

    expect(mockDB.put).toHaveBeenCalledWith('settings', {
      key: 'test-key',
      value: complexValue,
      updatedAt: expect.any(Date),
    });
  });

  it('should delete a setting', async () => {
    mockDB.delete.mockResolvedValue(undefined);

    await settingsDB.delete('test-key');

    expect(mockDB.delete).toHaveBeenCalledWith('settings', 'test-key');
  });

  it('should clear all settings', async () => {
    mockDB.clear.mockResolvedValue(undefined);

    await settingsDB.clear();

    expect(mockDB.clear).toHaveBeenCalledWith('settings');
  });
});
