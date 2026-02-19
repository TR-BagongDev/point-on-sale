import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SyncOperationType = "create_order" | "update_inventory" | "update_product" | "delete_product";

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  data: unknown;
  timestamp: number;
  retryCount?: number;
  status: "pending" | "processing" | "failed";
}

interface SyncQueueState {
  operations: SyncOperation[];
  isSyncing: boolean;
  addToQueue: (operation: Omit<SyncOperation, "id" | "timestamp" | "status">) => void;
  removeFromQueue: (id: string) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  getPendingCount: () => number;
  markAsProcessing: (id: string) => void;
  markAsFailed: (id: string) => void;
  incrementRetryCount: (id: string) => void;
}

export const useSyncQueueStore = create<SyncQueueState>()(
  persist(
    (set, get) => ({
      operations: [],
      isSyncing: false,

      addToQueue: (operation) => {
        const newOperation: SyncOperation = {
          ...operation,
          id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          status: "pending",
          retryCount: 0,
        };

        set((state) => ({
          operations: [...state.operations, newOperation],
        }));
      },

      removeFromQueue: (id) => {
        set((state) => ({
          operations: state.operations.filter((op) => op.id !== id),
        }));
      },

      processQueue: async () => {
        const state = get();
        const pendingOperations = state.operations.filter((op) => op.status === "pending");

        if (pendingOperations.length === 0 || state.isSyncing) {
          return;
        }

        set({ isSyncing: true });

        try {
          for (const operation of pendingOperations) {
            get().markAsProcessing(operation.id);

            try {
              // Process operation based on type
              // This will be implemented by the sync service
              await get().removeFromQueue(operation.id);
            } catch (error) {
              get().markAsFailed(operation.id);
              const op = get().operations.find((o) => o.id === operation.id);
              if (op && (op.retryCount || 0) < 3) {
                get().incrementRetryCount(operation.id);
                // Reset to pending for retry
                set((state) => ({
                  operations: state.operations.map((o) =>
                    o.id === operation.id ? { ...o, status: "pending" as const } : o
                  ),
                }));
              }
            }
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      clearQueue: () => set({ operations: [] }),

      getPendingCount: () => {
        return get().operations.filter((op) => op.status === "pending").length;
      },

      markAsProcessing: (id) => {
        set((state) => ({
          operations: state.operations.map((op) =>
            op.id === id ? { ...op, status: "processing" as const } : op
          ),
        }));
      },

      markAsFailed: (id) => {
        set((state) => ({
          operations: state.operations.map((op) =>
            op.id === id ? { ...op, status: "failed" as const } : op
          ),
        }));
      },

      incrementRetryCount: (id) => {
        set((state) => ({
          operations: state.operations.map((op) =>
            op.id === id
              ? { ...op, retryCount: (op.retryCount || 0) + 1 }
              : op
          ),
        }));
      },
    }),
    {
      name: "pos-sync-queue",
    }
  )
);
