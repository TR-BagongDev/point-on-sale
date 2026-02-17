"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { Loading } from "@/components/ui/loading";
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
  };
}

interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function MenuPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isAvailable: true,
  });

  useEffect(() => {
    fetchMenus();
    fetchCategories();
  }, []);

  const fetchMenus = async () => {
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
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/category");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      toast.error("Gagal memuat kategori", {
        description: "Terjadi kesalahan saat mengambil data kategori",
      });
    }
  };

  const handleOpenDialog = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        name: menu.name,
        description: menu.description || "",
        price: menu.price.toString(),
        categoryId: menu.categoryId,
        isAvailable: menu.isAvailable,
      });
    } else {
      setEditingMenu(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        categoryId: categories[0]?.id || "",
        isAvailable: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMenu(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      categoryId: "",
      isAvailable: true,
    });
  };

  const handleSubmit = async () => {
    // Form validation
    if (!formData.name.trim()) {
      toast.error("Nama menu wajib diisi", {
        description: "Silakan masukkan nama menu",
      });
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Harga tidak valid", {
        description: "Silakan masukkan harga yang valid",
      });
      return;
    }

    if (!formData.categoryId) {
      toast.error("Kategori wajib dipilih", {
        description: "Silakan pilih kategori untuk menu ini",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = "/api/menu";
      const method = editingMenu ? "PUT" : "POST";
      const body = editingMenu
        ? { ...formData, id: editingMenu.id }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save menu");
      }

      await fetchMenus();
      handleCloseDialog();

      toast.success(editingMenu ? "Menu berhasil diperbarui" : "Menu berhasil ditambahkan", {
        description: editingMenu
          ? `Menu "${formData.name}" telah diperbarui`
          : `Menu "${formData.name}" telah ditambahkan`,
      });
    } catch (error) {
      toast.error("Gagal menyimpan menu", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan menu",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const menuToDelete = menus.find((m) => m.id === id);
    if (!menuToDelete) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus menu "${menuToDelete.name}"?`)) return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/menu?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete menu");
      }

      await fetchMenus();

      toast.success("Menu berhasil dihapus", {
        description: `Menu "${menuToDelete.name}" telah dihapus`,
      });
    } catch (error) {
      toast.error("Gagal menghapus menu", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus menu",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleAvailability = async (menu: Menu) => {
    setIsToggling(menu.id);
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: menu.id,
          name: menu.name,
          description: menu.description,
          price: menu.price,
          categoryId: menu.categoryId,
          isAvailable: !menu.isAvailable,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle availability");
      }

      await fetchMenus();

      const newStatus = !menu.isAvailable;
      toast.success(
        newStatus ? "Menu ditandai tersedia" : "Menu ditandai habis",
        {
          description: `Menu "${menu.name}" sekarang ${newStatus ? "tersedia" : "habis"}`,
        }
      );
    } catch (error) {
      toast.error("Gagal mengubah status ketersediaan", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah status",
      });
    } finally {
      setIsToggling(null);
    }
  };

  // Group menus by category
  const menusByCategory = categories.map((category) => ({
    ...category,
    menus: menus.filter((menu) => menu.categoryId === category.id),
  }));

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen Menu</h1>
            <p className="text-muted-foreground">
              Kelola menu makanan dan minuman Anda
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-primary-600 hover:bg-primary-700">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Menu
          </Button>
        </div>

        {/* Menu List by Category */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loading size="lg" className="mx-auto mb-4 text-primary-600" />
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {menusByCategory.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.name}
                    <Badge variant="secondary">{category.menus.length} menu</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {category.menus.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Belum ada menu dalam kategori ini
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {category.menus.map((menu) => (
                        <div
                          key={menu.id}
                          className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-md transition-shadow"
                        >
                          <div className="aspect-square w-16 h-16 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-2xl shrink-0">
                            {category.icon || "🍜"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{menu.name}</h3>
                              <Badge
                                variant={menu.isAvailable ? "default" : "secondary"}
                                className={`cursor-pointer ${
                                  menu.isAvailable
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "bg-gray-400"
                                }`}
                                onClick={() => toggleAvailability(menu)}
                              >
                                {isToggling === menu.id ? (
                                  <Loading size="sm" className="text-current" />
                                ) : menu.isAvailable ? (
                                  "Tersedia"
                                ) : (
                                  "Habis"
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {menu.description || "-"}
                            </p>
                            <p className="font-bold text-primary-600 mt-1">
                              {formatCurrency(menu.price)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(menu)}
                              disabled={isDeleting === menu.id || isToggling === menu.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(menu.id)}
                              disabled={isDeleting === menu.id || isToggling === menu.id}
                            >
                              {isDeleting === menu.id ? (
                                <Loading size="sm" className="text-current" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMenu ? "Edit Menu" : "Tambah Menu Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Menu</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Masukkan nama menu"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Deskripsi menu (opsional)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Harga (Rp)</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="Contoh: 15000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isSaving ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  {editingMenu ? "Menyimpan..." : "Menambahkan..."}
                </>
              ) : editingMenu ? (
                "Simpan"
              ) : (
                "Tambah"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
