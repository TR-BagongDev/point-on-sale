import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OfflineState {
  isOnline: boolean;
  lastOnlineTime: number | null;
  setOnline: (status: boolean) => void;
  setIsOnline: (status: boolean) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      lastOnlineTime: null,

      setOnline: (status) => {
        set((state) => ({
          isOnline: status,
          lastOnlineTime: status ? Date.now() : state.lastOnlineTime,
        }));
      },

      setIsOnline: (status) => {
        set((state) => ({
          isOnline: status,
          lastOnlineTime: status ? Date.now() : state.lastOnlineTime,
        }));
      },
    }),
    {
      name: "pos-offline",
    }
  )
);
