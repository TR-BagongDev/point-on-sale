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
  Edit,
  Trash2,
  Eye,
  FileText,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface LocalOrder {
  id: string;
  orderNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: string;
  user: {
    name: string;
  };
  items: {
    id: string;
    quantity: number;
    price: number;
    notes: string | null;
    menu: {
      name: string;
    };
  }[];
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

export default function PesananPage() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
  }, [dateFrom, dateTo, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/order?date=${dateFrom}`;
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { className: string; label: string }> = {
      PENDING: {
        className: "bg-yellow-100 text-yellow-700 border-yellow-300",
        label: "Menunggu",
      },
      PREPARING: {
        className: "bg-blue-100 text-blue-700 border-blue-300",
        label: "Disiapkan",
      },
      READY: {
        className: "bg-purple-100 text-purple-700 border-purple-300",
        label: "Siap",
      },
      COMPLETED: {
        className: "bg-green-100 text-green-700 border-green-300",
        label: "Selesai",
      },
    };
    return styles[status] || {
      className: "bg-gray-100 text-gray-700 border-gray-300",
      label: status,
    };
  };

  const getPaymentBadge = (method: string) => {
    const styles: Record<string, string> = {
      CASH: "bg-green-100 text-green-700",
      QRIS: "bg-blue-100 text-blue-700",
      DEBIT: "bg-purple-100 text-purple-700",
    };
    return styles[method] || "bg-gray-100 text-gray-700";
  };

  return (
    <DashboardLayout userName="Admin" userRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Pesanan</h1>
          <p className="text-muted-foreground">
            Kelola dan pantau semua pesanan
          </p>
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
                <span className="text-sm font-medium">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="PENDING">Menunggu</SelectItem>
                    <SelectItem value="PREPARING">Disiapkan</SelectItem>
                    <SelectItem value="READY">Siap</SelectItem>
                    <SelectItem value="COMPLETED">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Semua Pesanan</CardTitle>
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
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Pesanan</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Kasir</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const statusBadge = getStatusBadge(order.status);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>{order.user.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="text-sm">
                                  <div className="flex items-start gap-2">
                                    <span>{item.menu.name} x{item.quantity}</span>
                                    {item.notes && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        {item.notes}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {order.notes && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 mt-1"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Pesanan: {order.notes}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPaymentBadge(order.paymentMethod)}>
                              {order.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusBadge.className}>
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {formatCurrency(order.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Lihat Detail"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {order.status === "PENDING" || order.status === "PREPARING" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit Pesanan"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
