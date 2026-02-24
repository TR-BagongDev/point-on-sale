"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { AccessibilityToggle } from "@/components/accessibility/AccessibilityToggle";
import {
  Settings,
  Store,
  Receipt,
  User,
  Save,
  Check,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  npwp: string;
  taxRate: number;
}

interface ReceiptSettings {
  header: string;
  footer: string;
  showDate: boolean;
  showTime: boolean;
  showCashier: boolean;
  showTax: boolean;
  taxCompliant: boolean;
  paperWidth: number;
}

interface UserSession {
  name: string;
  email: string;
  role: string;
}

export default function PengaturanPage() {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: "",
    address: "",
    phone: "",
    npwp: "",
    taxRate: 10,
  });

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    header: "",
    footer: "",
    showDate: true,
    showTime: true,
    showCashier: true,
    showTax: true,
    taxCompliant: false,
    paperWidth: 80,
  });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchSettings();
    fetchUserSession();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setStoreSettings({
          storeName: data.storeName || "",
          address: data.address || "",
          phone: data.phone || "",
          npwp: data.npwp || "",
          taxRate: data.taxRate || 10,
        });
      }

      const receiptRes = await fetch("/api/receipt-template");
      if (receiptRes.ok) {
        const receiptData = await receiptRes.json();
        if (receiptData) {
          setReceiptSettings({
            header: receiptData.header || "",
            footer: receiptData.footer || "",
            showDate: receiptData.showDate ?? true,
            showTime: receiptData.showTime ?? true,
            showCashier: receiptData.showCashier ?? true,
            showTax: receiptData.showTax ?? true,
            taxCompliant: receiptData.taxCompliant ?? false,
            paperWidth: receiptData.paperWidth || 80,
          });
        }
      }
    } catch (error) {
      toast.error("Gagal memuat pengaturan", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil data pengaturan",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Failed to fetch user session");
      const data = await res.json();
      setUserName(data.name || "");
      setUserEmail(data.email || "");
      setUserRole(data.role || "");
      setEditName(data.name || "");
      setEditEmail(data.email || "");
    } catch (error) {
      toast.error("Gagal memuat sesi pengguna", {
        description: "Terjadi kesalahan saat mengambil data pengguna",
      });
    }
  };

  const handleSaveStore = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeSettings),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan pengaturan toko");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      toast.success("Pengaturan toko berhasil disimpan", {
        description: "Perubahan telah diterapkan",
      });
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan toko", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan pengaturan",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReceipt = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/receipt-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptSettings),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan template struk");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      toast.success("Template struk berhasil disimpan", {
        description: "Perubahan telah diterapkan",
      });
    } catch (error) {
      toast.error("Gagal menyimpan template struk", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan template",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async () => {
    // Validation: name is required
    if (!editName.trim()) {
      toast.error("Nama tidak boleh kosong", {
        description: "Silakan masukkan nama Anda",
      });
      return;
    }

    // Validation: email is required and valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editEmail.trim()) {
      toast.error("Email tidak boleh kosong", {
        description: "Silakan masukkan email Anda",
      });
      return;
    }
    if (!emailRegex.test(editEmail)) {
      toast.error("Format email tidak valid", {
        description: "Silakan masukkan alamat email yang valid",
      });
      return;
    }

    // Validation: if updating password, all password fields must be filled and match
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        toast.error("Password saat ini diperlukan", {
          description: "Silakan masukkan password saat ini untuk mengubah password",
        });
        return;
      }
      if (newPassword.length < 6) {
        toast.error("Password baru terlalu pendek", {
          description: "Password baru harus minimal 6 karakter",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Konfirmasi password tidak cocok", {
          description: "Password baru dan konfirmasi password harus sama",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const updateData: { name: string; email: string; currentPassword?: string; newPassword?: string } = {
        name: editName.trim(),
        email: editEmail.trim(),
      };

      // Only include password fields if new password is provided
      if (newPassword && currentPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal mengupdate akun");
      }

      // Update local state with new values
      setUserName(editName.trim());
      setUserEmail(editEmail.trim());

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      toast.success("Akun berhasil diperbarui", {
        description: "Perubahan telah diterapkan",
      });
    } catch (error) {
      toast.error("Gagal mengupdate akun", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengupdate akun",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">
            Kelola pengaturan toko dan sistem
          </p>
        </div>

        {/* Success Alert */}
        {saved && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Pengaturan berhasil disimpan!
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Toko
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Struk
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Akun
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Aksesibilitas
            </TabsTrigger>
          </TabsList>

          {/* Store Settings */}
          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Toko</CardTitle>
                <CardDescription>
                  Pengaturan dasar untuk toko Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Nama Toko</Label>
                    <Input
                      id="storeName"
                      value={storeSettings.storeName}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, storeName: e.target.value })
                      }
                      placeholder="Nama toko Anda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      value={storeSettings.phone}
                      onChange={(e) =>
                        setStoreSettings({ ...storeSettings, phone: e.target.value })
                      }
                      placeholder="081234567890"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={storeSettings.address}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, address: e.target.value })
                    }
                    placeholder="Alamat lengkap toko"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npwp">NPWP</Label>
                  <Input
                    id="npwp"
                    value={storeSettings.npwp}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, npwp: e.target.value })
                    }
                    placeholder="XX.XXX.XXX.X-XXX.XXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nomor Pokok Wajib Pajak (format: XX.XXX.XXX.X-XXX.XXX)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tarif Pajak (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={storeSettings.taxRate}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="10"
                  />
                </div>
                <Button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Settings */}
          <TabsContent value="receipt">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Receipt Settings Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Struk</CardTitle>
                  <CardDescription>
                    Kustomisasi tampilan struk pembayaran
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="header">Header Struk</Label>
                    <textarea
                      id="header"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={receiptSettings.header}
                      onChange={(e) =>
                        setReceiptSettings({ ...receiptSettings, header: e.target.value })
                      }
                      placeholder="WARUNG NASI GORENG - Jl. Contoh No. 123 - Telp: 081234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footer">Footer Struk</Label>
                    <textarea
                      id="footer"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={receiptSettings.footer}
                      onChange={(e) =>
                        setReceiptSettings({ ...receiptSettings, footer: e.target.value })
                      }
                      placeholder="Terima kasih atas kunjungan Anda!"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label>Opsi Tampilan</Label>
                    <div className="grid gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={receiptSettings.showDate}
                          onChange={(e) =>
                            setReceiptSettings({
                              ...receiptSettings,
                              showDate: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Tampilkan Tanggal</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={receiptSettings.showTime}
                          onChange={(e) =>
                            setReceiptSettings({
                              ...receiptSettings,
                              showTime: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Tampilkan Waktu</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={receiptSettings.showCashier}
                          onChange={(e) =>
                            setReceiptSettings({
                              ...receiptSettings,
                              showCashier: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Tampilkan Nama Kasir</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={receiptSettings.showTax}
                          onChange={(e) =>
                            setReceiptSettings({
                              ...receiptSettings,
                              showTax: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Tampilkan Pajak</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={receiptSettings.taxCompliant}
                          onChange={(e) =>
                            setReceiptSettings({
                              ...receiptSettings,
                              taxCompliant: e.target.checked,
                            })
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Format Pajak (PPN)</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paperWidth">Lebar Kertas (mm)</Label>
                    <select
                      id="paperWidth"
                      className="flex h-10 w-full max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={receiptSettings.paperWidth}
                      onChange={(e) =>
                        setReceiptSettings({
                          ...receiptSettings,
                          paperWidth: parseInt(e.target.value),
                        })
                      }
                    >
                      <option value={58}>58mm</option>
                      <option value={80}>80mm</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleSaveReceipt}
                    disabled={saving}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Menyimpan..." : "Simpan Template"}
                  </Button>
                </CardContent>
              </Card>

              {/* Receipt Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview Struk</CardTitle>
                  <CardDescription>
                    Preview langsung tampilan struk
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <ReceiptPreview
                      template={receiptSettings}
                      settings={storeSettings}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Akun</CardTitle>
                <CardDescription>
                  Kelola akun dan keamanan Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama Anda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Password Saat Ini</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini untuk mengubah password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Diperlukan hanya jika ingin mengubah password
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password baru (minimal 6 karakter)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateAccount}
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Menyimpan..." : "Update Akun"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Settings */}
          <TabsContent value="accessibility">
            <AccessibilityToggle />
          </TabsContent>
        </Tabs>
      </div>
  );
}
