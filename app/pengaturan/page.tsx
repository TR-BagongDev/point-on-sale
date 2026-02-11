"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import {
  Settings,
  Store,
  Receipt,
  User,
  Save,
  Check,
} from "lucide-react";

interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  taxRate: number;
}

interface ReceiptSettings {
  header: string;
  footer: string;
  showDate: boolean;
  showTime: boolean;
  showCashier: boolean;
  showTax: boolean;
  paperWidth: number;
}

export default function PengaturanPage() {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: "",
    address: "",
    phone: "",
    taxRate: 10,
  });

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    header: "",
    footer: "",
    showDate: true,
    showTime: true,
    showCashier: true,
    showTax: true,
    paperWidth: 80,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
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
            paperWidth: receiptData.paperWidth || 80,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
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

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
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

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save receipt settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout userName="Admin" userRole="ADMIN">
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
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
                      placeholder="WARUNG NASI GORENG&#10;Jl. Contoh No. 123&#10;Telp: 081234567890"
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
                    <Input id="name" defaultValue="Admin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="admin@warung.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Password Saat Ini</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                </div>
                <Button className="bg-primary-600 hover:bg-primary-700">
                  <Save className="h-4 w-4 mr-2" />
                  Update Akun
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
