"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  menu: {
    id: string;
    name: string;
    price: number;
    category: {
      name: string;
      color: string | null;
    };
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  notes: string | null;
  items: OrderItem[];
}

interface Menu {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
  };
}

interface OrderModificationDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated: () => void;
}

export function OrderModificationDialog({
  order,
  open,
  onOpenChange,
  onOrderUpdated,
}: OrderModificationDialogProps) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [newItemNotes, setNewItemNotes] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [localItems, setLocalItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (order) {
      setLocalItems(order.items);
      setOrderNotes(order.notes || "");
    }
  }, [order]);

  useEffect(() => {
    if (open) {
      fetchMenus();
    }
  }, [open]);

  const fetchMenus = async () => {
    setLoadingMenus(true);
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      setMenus(data.filter((m: Menu) => m.isAvailable));
      if (data.length > 0) {
        setSelectedMenuId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch menus:", error);
      toast.error("Gagal memuat menu");
    } finally {
      setLoadingMenus(false);
    }
  };

  const handleClose = () => {
    setLocalItems([]);
    setOrderNotes("");
    setSelectedMenuId("");
    setNewItemNotes("");
    onOpenChange(false);
  };

  const handleAddItem = async () => {
    if (!selectedMenuId || !order) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/order/${order.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: selectedMenuId,
          quantity: 1,
          notes: newItemNotes || null,
        }),
      });

      if (res.ok) {
        const newItem = await res.json();

        // Update local state
        const existingIndex = localItems.findIndex(
          (item) => item.menu.id === selectedMenuId && item.notes === (newItemNotes || null)
        );

        if (existingIndex >= 0) {
          const updated = [...localItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
          };
          setLocalItems(updated);
        } else {
          setLocalItems([...localItems, newItem]);
        }

        setNewItemNotes("");
        toast.success("Item berhasil ditambahkan");
        onOrderUpdated();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal menambahkan item");
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Gagal menambahkan item");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || !order) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/order/${order.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          quantity: newQuantity,
        }),
      });

      if (res.ok) {
        const updated = localItems.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        );
        setLocalItems(updated);
        toast.success("Jumlah berhasil diperbarui");
        onOrderUpdated();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal mengubah jumlah");
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
      toast.error("Gagal mengubah jumlah");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string) => {
    if (!order) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/order/${order.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          notes,
        }),
      });

      if (res.ok) {
        const updated = localItems.map((item) =>
          item.id === itemId ? { ...item, notes: notes || null } : item
        );
        setLocalItems(updated);
        toast.success("Catatan berhasil diperbarui");
        onOrderUpdated();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal mengubah catatan");
      }
    } catch (error) {
      console.error("Failed to update notes:", error);
      toast.error("Gagal mengubah catatan");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!order || !confirm("Apakah Anda yakin ingin menghapus item ini?")) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/order/${order.id}/items?itemId=${itemId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const updated = localItems.filter((item) => item.id !== itemId);
        setLocalItems(updated);
        toast.success("Item berhasil dihapus");
        onOrderUpdated();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal menghapus item");
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast.error("Gagal menghapus item");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateOrderNotes = async () => {
    if (!order) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/order/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: orderNotes || null,
        }),
      });

      if (res.ok) {
        toast.success("Catatan pesanan berhasil diperbarui");
        onOrderUpdated();
        handleClose();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal mengubah catatan");
      }
    } catch (error) {
      console.error("Failed to update order notes:", error);
      toast.error("Gagal mengubah catatan");
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = () => {
    return localItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const canModify = order && (order.status === "PENDING" || order.status === "PREPARING");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Pesanan #{order?.orderNumber}</DialogTitle>
        </DialogHeader>

        {!canModify && order && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Pesanan dengan status <strong>{order.status}</strong> tidak dapat dimodifikasi.
              Hanya pesanan dengan status PENDING atau PREPARING yang dapat diubah.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Add New Item Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tambah Item</label>
            <div className="flex gap-2">
              <Select
                value={selectedMenuId}
                onValueChange={setSelectedMenuId}
                disabled={!canModify || loadingMenus || updating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingMenus ? "Memuat menu..." : "Pilih menu"} />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name} - {formatCurrency(menu.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Catatan item..."
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                disabled={!canModify || updating}
                className="w-48"
              />
              <Button
                onClick={handleAddItem}
                disabled={!canModify || !selectedMenuId || updating}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Current Items Table */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Item Pesanan</label>
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Belum ada item dalam pesanan
                      </TableCell>
                    </TableRow>
                  ) : (
                    localItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.menu.name}</TableCell>
                        <TableCell>
                          <Input
                            value={item.notes || ""}
                            onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                            disabled={!canModify || updating}
                            placeholder="Tambah catatan..."
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={!canModify || updating || item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={!canModify || updating}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={!canModify || updating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Order Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Catatan Pesanan</label>
            <Input
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              disabled={!canModify || updating}
              placeholder="Catatan untuk seluruh pesanan..."
              maxLength={200}
            />
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-4 border-t">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(calculateTotal())}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updating}>
            {canModify ? "Batal" : "Tutup"}
          </Button>
          {canModify && (
            <Button
              onClick={handleUpdateOrderNotes}
              disabled={updating}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
