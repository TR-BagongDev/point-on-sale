import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Offline state management
 * Tracks online/offline status and last online time
 */
interface OfflineState {
  isOnline: boolean;
  lastOnlineTime: number | null;
  setOnline: (status: boolean) => void;
  setIsOnline: (status: boolean) => void;
  initializeOnlineListeners: () => void;
}

/**
 * Store reference to the set function for event listeners
 */
let setOnlineState: ((status: boolean) => void) | null = null;

/**
 * Handle online event
 */
function handleOnline() {
  if (setOnlineState) {
    setOnlineState(true);
  }
}

/**
 * Handle offline event
 */
function handleOffline() {
  if (setOnlineState) {
    setOnlineState(false);
  }
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
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

      /**
       * Initialize online/offline event listeners
       * Should be called once when the app starts
       */
      initializeOnlineListeners: () => {
        if (typeof window === "undefined") {
          return;
        }

        // Store reference to update function
        setOnlineState = (status: boolean) => {
          set((state) => ({
            isOnline: status,
            lastOnlineTime: status ? Date.now() : state.lastOnlineTime,
          }));
        };

        // Add event listeners
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Initialize current state
        setOnlineState(navigator.onLine);
      },
    }),
    {
      name: "pos-offline",
    }
  )
);
