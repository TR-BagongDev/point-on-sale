"use client";

import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCartStore } from "@/store/cart";
import { useOfflineStore } from "@/store/offline-store";
import { useSyncQueueStore } from "@/store/sync-queue";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { formatCurrency } from "@/lib/utils";
import { printReceipt, type Order } from "@/lib/receipt";
import { toast } from "@/lib/toast";
import { useAccessibility } from "@/lib/accessibility-context";
import { MenuGrid } from "./components/MenuGrid";
import { CartPanel } from "./components/CartPanel";
import { CheckoutDialog } from "./components/CheckoutDialog";
import { OpenShiftDialog } from "./components/OpenShiftDialog";

interface Menu {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  categoryId: string;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

interface Shift {
  id: string;
  status: string;
  openedAt: string;
  user: {
    id: string;
    name: string;
  };
}

const TAX_RATE = 10; // 10% Pajak

export function KasirClient() {
  const { simpleMode } = useAccessibility();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showOpenShiftDialog, setShowOpenShiftDialog] = useState(false);

  // Offline and sync state
  const isOnline = useOfflineStore((state) => state.isOnline);
  const isSyncing = useSyncQueueStore((state) => state.isSyncing);
  const pendingCount = useSyncQueueStore((state) => state.getPendingCount());

  const { items, addItem, removeItem, updateQuantity, updateNotes, clearCart, getSubtotal, getTax, getTotal, getItemCount } = useCartStore();

  // =========================================================================
  // Data Fetching
  // =========================================================================

  async function fetchMenus() {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error("Failed to fetch menus");
      const data = await res.json();
      setMenus(data);
    } catch (error) {
      toast.error("Gagal memuat menu", {
        description: "Terjadi kesalahan saat mengambil data menu",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/category");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      toast.error("Gagal memuat kategori", {
        description: "Terjadi kesalahan saat mengambil data kategori",
      });
    }
  }

  async function fetchCurrentShift() {
    try {
      setShiftLoading(true);
      const res = await fetch("/api/shift?status=OPEN");
      if (!res.ok) {
        if (res.status === 401) {
          setCurrentShift(null);
          return;
        }
        throw new Error("Failed to fetch shift");
      }
      const data = await res.json();
      const userShift = Array.isArray(data) ? data[0] : null;
      setCurrentShift(userShift);
    } catch (error) {
      setCurrentShift(null);
    } finally {
      setShiftLoading(false);
    }
  }

  useEffect(() => {
    fetchMenus();
    fetchCategories();
    fetchCurrentShift();
    useOfflineStore.getState().initializeOnlineListeners();
  }, []);

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleAddToCart = (menu: Menu) => {
    addItem({
      id: menu.id,
      name: menu.name,
      price: menu.price,
      image: menu.image ?? undefined,
    });
  };

  const handleOpenShift = async (startingCash: number) => {
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startingCash }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to open shift");
      }

      const shift = await res.json();
      setCurrentShift(shift);
      setShowOpenShiftDialog(false);
      toast.success("Shift berhasil dibuka!", {
        description: `Shift dimulai dengan modal ${formatCurrency(startingCash)}`,
      });
    } catch (error: any) {
      toast.error("Gagal membuka shift", {
        description: error.message || "Terjadi kesalahan saat membuka shift",
      });
    }
  };

  const handleCheckout = async (paymentMethod: string) => {
    setIsCheckingOut(true);
    try {
      const order = {
        items: items.map((item) => ({
          menuId: item.id,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        subtotal,
        tax,
        discount,
        total,
        paymentMethod,
        notes: orderNotes,
      };

      if (!isOnline) {
        toast.info("Mode Offline", {
          description: "Pesanan akan disimpan secara lokal dan disinkronkan saat Anda kembali online.",
        });
      }

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const createdOrder: Order = await res.json();

      clearCart();
      setShowCheckout(false);
      setDiscount(0);
      setOrderNotes("");

      if (isOnline) {
        toast.success("Pesanan berhasil dibuat!", {
          description: `Total: ${formatCurrency(total)}`,
        });
      } else {
        toast.success("Pesanan disimpan secara lokal", {
          description: `Total: ${formatCurrency(total)}. Akan disinkronkan saat online.`,
        });
      }

      try {
        printReceipt({
          order: createdOrder,
          template: { paperWidth: 80 },
          settings: {
            storeName: "Warung Nasi Goreng",
            address: "",
            phone: "",
            taxRate: TAX_RATE,
            currency: "IDR",
          },
        });
      } catch (printError) {
        toast.warning("Gagal mencetak struk", {
          description: "Pesanan tetap berhasil dibuat",
        });
      }
    } catch (error) {
      toast.error("Gagal memproses pesanan", {
        description: "Terjadi kesalahan saat membuat pesanan",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleQuickCheckout = async () => {
    await handleCheckout("CASH");
  };

  // =========================================================================
  // Derived State
  // =========================================================================

  const subtotal = getSubtotal();
  const tax = getTax(TAX_RATE);
  const total = getTotal(TAX_RATE, discount);

  const getSyncStatus = (): "online" | "offline" | "syncing" | "pending" => {
    if (isSyncing) return "syncing";
    if (!isOnline) return "offline";
    if (pendingCount > 0) return "pending";
    return "online";
  };

  const getShiftStatus = (): "open" | "closed" | "none" => {
    if (shiftLoading) return "none";
    if (currentShift?.status === "OPEN") return "open";
    return "none";
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <TooltipProvider>
      <OfflineBanner />
      {loading ? (
        <div className="flex gap-6 h-[calc(100vh-3rem)]">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 h-[calc(100vh-3rem)]">
          <MenuGrid
            menus={menus}
            categories={categories}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            onCategoryChange={setSelectedCategory}
            onSearchChange={setSearchQuery}
            onAddToCart={handleAddToCart}
          />

          <CartPanel
            items={items}
            subtotal={subtotal}
            tax={tax}
            total={total}
            taxRate={TAX_RATE}
            discount={discount}
            simpleMode={simpleMode}
            pendingCount={pendingCount}
            shiftLoading={shiftLoading}
            currentShiftName={currentShift ? `Shift: ${currentShift.user.name}` : undefined}
            syncStatus={getSyncStatus()}
            shiftStatus={getShiftStatus()}
            onUpdateQuantity={updateQuantity}
            onUpdateNotes={updateNotes}
            onRemoveItem={removeItem}
            onDiscountChange={setDiscount}
            onQuickCheckout={handleQuickCheckout}
            onShowCheckout={() => setShowCheckout(true)}
            onOpenShift={() => setShowOpenShiftDialog(true)}
            getItemCount={getItemCount}
          />

          <CheckoutDialog
            open={showCheckout}
            onOpenChange={setShowCheckout}
            total={total}
            orderNotes={orderNotes}
            onNotesChange={setOrderNotes}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
            simpleMode={simpleMode}
          />

          <OpenShiftDialog
            open={showOpenShiftDialog}
            onOpenChange={setShowOpenShiftDialog}
            onOpenShift={handleOpenShift}
          />
        </div>
      )}
    </TooltipProvider>
  );
}
