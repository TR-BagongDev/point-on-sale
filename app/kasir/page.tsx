"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCartStore, type CartItem } from "@/store/cart";
import {
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingCart,
  Search,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { printReceipt, type Order } from "@/lib/receipt";
import { toast } from "@/lib/toast";

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

const TAX_RATE = 10; // 10% Pajak

export default function KasirPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [discount, setDiscount] = useState(0);

  const { items, addItem, removeItem, updateQuantity, updateNotes, clearCart, getSubtotal, getTax, getTotal, getItemCount } = useCartStore();

  useEffect(() => {
    fetchMenus();
    fetchCategories();
  }, []);

  const fetchMenus = async () => {
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      setMenus(data);
    } catch (error) {
      console.error("Failed to fetch menus:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/category");
      const data = await res.json();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleAddToCart = (menu: Menu) => {
    addItem({
      id: menu.id,
      name: menu.name,
      price: menu.price,
      image: menu.image ?? undefined,
    });
  };

  const filteredMenus = menus.filter((menu) => {
    const matchesCategory = !selectedCategory || menu.categoryId === selectedCategory;
    const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && menu.isAvailable;
  });

  const subtotal = getSubtotal();
  const tax = getTax(TAX_RATE);
  const total = getTotal(TAX_RATE, discount);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCheckout = async (paymentMethod: string) => {
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
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (res.ok) {
        const createdOrder: Order = await res.json();

        // Clear cart and close dialog
        clearCart();
        setShowCheckout(false);
        setDiscount(0);

        // Auto-print receipt
        try {
          printReceipt({
            order: createdOrder,
            template: {
              paperWidth: 80, // Default to 80mm thermal printer
            },
            settings: {
              storeName: "Warung Nasi Goreng",
              address: "",
              phone: "",
              taxRate: TAX_RATE,
              currency: "IDR",
            },
          });
        } catch (printError) {
          console.error("Print failed:", printError);
          // Still show success even if print fails
          toast.success("Pesanan berhasil dibuat!", {
            description: "Gagal mencetak struk",
          });
        }
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Gagal memproses pesanan");
    }
  };

  return (
    <DashboardLayout userName="Admin" userRole="ADMIN">
      <div className="flex gap-6 h-[calc(100vh-3rem)]">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "shrink-0",
                  selectedCategory === category.id && "bg-primary-600 hover:bg-primary-700"
                )}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Menu Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMenus.map((menu) => (
                <Card
                  key={menu.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group"
                  onClick={() => handleAddToCart(menu)}
                >
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    {menu.image ? (
                      <img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">🍜</span>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm truncate">{menu.name}</h3>
                    <p className="text-primary-600 font-bold mt-1">
                      {formatCurrency(menu.price)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Section */}
        <Card className="w-96 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Keranjang
              </CardTitle>
              {items.length > 0 && (
                <Badge variant="secondary">{getItemCount()} item</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Keranjang kosong</p>
                  <p className="text-sm">Klik menu untuk menambahkan</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 py-2 border-b pb-3 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.price)}
                          </p>
                          <Input
                            type="text"
                            placeholder="Catatan..."
                            value={item.notes || ""}
                            onChange={(e) => updateNotes(item.id, e.target.value)}
                            className="mt-2 h-8 text-xs"
                            maxLength={100}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-6 border-t">
                  {/* Discount Input */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">Diskon:</span>
                    <Input
                      type="number"
                      value={discount || ""}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="h-8 w-24"
                      placeholder="0"
                    />
                  </div>

                  <Separator className="my-3" />

                  {/* Summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pajak ({TAX_RATE}%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-secondary-600">
                        <span>Diskon</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary-600">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 h-12 text-lg bg-primary-600 hover:bg-primary-700"
                    onClick={() => setShowCheckout(true)}
                  >
                    Bayar Sekarang
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleCheckout("CASH")}
            >
              <Banknote className="h-8 w-8" />
              <span>Tunai</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleCheckout("QRIS")}
            >
              <QrCode className="h-8 w-8" />
              <span>QRIS</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleCheckout("DEBIT")}
            >
              <CreditCard className="h-8 w-8" />
              <span>Debit</span>
            </Button>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(total)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
