"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  FileText,
} from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
  };
  items: {
    quantity: number;
    price: number;
    menu: {
      name: string;
    };
  }[];
}

interface ReportStats {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  totalTax: number;
  totalDiscount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function LaporanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    // Set default dates to today
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today);
    setDateTo(today);
  }, []);

  useEffect(() => {
    if (dateFrom) {
      fetchOrders();
    }
  }, [dateFrom, dateTo, paymentFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/order?date=${dateFrom}`;
      if (dateTo && dateTo !== dateFrom) {
        // For date range, we'll just use the single date for now
      }

      const res = await fetch(url);
      let data = await res.json();

      // Filter by payment method
      if (paymentFilter !== "all") {
        data = data.filter((order: Order) => order.paymentMethod === paymentFilter);
      }

      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats: ReportStats = {
    totalSales: orders.reduce((sum, order) => sum + order.total, 0),
    totalOrders: orders.length,
    averageOrder: orders.length > 0
      ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
      : 0,
    totalTax: orders.reduce((sum, order) => sum + order.tax, 0),
    totalDiscount: orders.reduce((sum, order) => sum + order.discount, 0),
  };

  const getPaymentBadge = (method: string) => {
    const styles: Record<string, string> = {
      CASH: "bg-green-100 text-green-700",
      QRIS: "bg-blue-100 text-blue-700",
      DEBIT: "bg-purple-100 text-purple-700",
    };
    return styles[method] || "bg-gray-100 text-gray-700";
  };

  const exportToCSV = () => {
    const headers = ["No. Pesanan", "Tanggal", "Kasir", "Items", "Subtotal", "Pajak", "Diskon", "Total", "Metode"];
    const rows = orders.map((order) => [
      order.orderNumber,
      formatDate(order.createdAt),
      order.user.name,
      order.items.map((i) => `${i.menu.name} x${i.quantity}`).join(", "),
      order.subtotal,
      order.tax,
      order.discount,
      order.total,
      order.paymentMethod,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-penjualan-${dateFrom}.csv`;
    link.click();
  };

  return (
    <DashboardLayout userName="Admin" userRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan</h1>
            <p className="text-muted-foreground">
              Lihat dan analisis penjualan Anda
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Dari:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sampai:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Metode:</span>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="CASH">Tunai</SelectItem>
                    <SelectItem value="QRIS">QRIS</SelectItem>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Penjualan
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totalSales)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Pesanan
                  </p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Rata-rata Pesanan
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.averageOrder)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Pajak
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalTax)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada pesanan pada periode ini
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Pesanan</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Kasir</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>{order.user.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {order.items.map((i) => `${i.menu.name} x${i.quantity}`).join(", ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentBadge(order.paymentMethod)}>
                            {order.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary-600">
                          {formatCurrency(order.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
