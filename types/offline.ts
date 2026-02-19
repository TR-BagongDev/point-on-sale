/**
 * Offline-First Type Definitions
 *
 * This file contains TypeScript types for offline-first PWA functionality.
 * These types extend the base API types with synchronization fields for
 * offline data storage and sync queue management.
 */

// ============================================================================
// Sync Status Types
// ============================================================================

export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'failed';

export interface SyncMetadata {
  syncStatus: SyncStatus;
  syncedAt: Date | null;
  localId: string;
  retryCount: number;
  lastSyncAttempt: Date | null;
  conflictReason: string | null;
}

// ============================================================================
// Offline Order Types
// ============================================================================

export interface OfflineOrderItem {
  id: string;
  orderId: string;
  menuId: string;
  quantity: number;
  price: number;
  notes: string | null;
  menu?: OfflineMenu;
}

export interface OfflineOrderUser {
  id: string;
  name: string;
  email?: string;
}

export interface OfflineOrder {
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
  // Sync metadata
  syncStatus: SyncStatus;
  syncedAt: Date | null;
  localId: string;
  retryCount: number;
  lastSyncAttempt: Date | null;
  conflictReason: string | null;
  // Relations
  user?: OfflineOrderUser;
  items?: OfflineOrderItem[];
}

// ============================================================================
// Offline Menu Types
// ============================================================================

export interface OfflineCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  // Cache metadata
  cachedAt: Date;
  version: number;
}

export interface OfflineMenu {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Cache metadata
  cachedAt: Date;
  version: number;
  // Relations
  category?: OfflineCategory;
}

// ============================================================================
// Sync Queue Types
// ============================================================================

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperationType;
  entityType: 'ORDER' | 'MENU' | 'CATEGORY';
  entityId: string;
  localId: string;
  data: Record<string, unknown>;
  syncStatus: SyncStatus;
  retryCount: number;
  lastSyncAttempt: Date | null;
  conflictReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Offline Store State Types
// ============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'syncing' | 'conflict';

export interface OfflineState {
  isOnline: boolean;
  connectionStatus: ConnectionStatus;
  pendingSyncCount: number;
  lastSyncTime: Date | null;
  syncInProgress: boolean;
  syncError: string | null;
}

// ============================================================================
// IndexedDB Storage Types
// ============================================================================

export type OfflineStoreName =
  | 'orders'
  | 'orderItems'
  | 'menus'
  | 'categories'
  | 'syncQueue'
  | 'settings';

export interface OfflineStorageOptions {
  storeName: OfflineStoreName;
  mode: IDBTransactionMode;
}

// ============================================================================
// Sync Result Types
// ============================================================================

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  errors: Array<{
    entityId: string;
    error: string;
  }>;
  duration: number;
}

export interface SyncBatchResult {
  batchId: string;
  results: SyncResult[];
  totalSynced: number;
  totalFailed: number;
  totalConflicts: number;
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export type ConflictResolutionStrategy = 'local' | 'remote' | 'manual';

export interface ConflictResolution {
  localId: string;
  remoteId: string;
  entityType: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  conflictFields: string[];
  strategy: ConflictResolutionStrategy;
  resolvedAt: Date | null;
}

// ============================================================================
// Offline Cache Metadata
// ============================================================================

export interface CacheMetadata {
  version: number;
  lastUpdated: Date;
  expiresAt: Date | null;
  size: number;
  isValid: boolean;
}

export interface MenuCacheMetadata extends CacheMetadata {
  menuCount: number;
  categoryCount: number;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isOfflineOrder(obj: unknown): obj is OfflineOrder {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'syncStatus' in obj &&
    'localId' in obj &&
    'orderNumber' in obj
  );
}

export function isSyncQueueItem(obj: unknown): obj is SyncQueueItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'operation' in obj &&
    'entityType' in obj &&
    'localId' in obj
  );
}

export function needsSync(item: OfflineOrder | SyncQueueItem): boolean {
  return item.syncStatus === 'pending' || item.syncStatus === 'failed';
}

export function isSynced(item: OfflineOrder | SyncQueueItem): boolean {
  return item.syncStatus === 'synced';
}

export function hasConflict(item: OfflineOrder | SyncQueueItem): boolean {
  return item.syncStatus === 'conflict';
}
