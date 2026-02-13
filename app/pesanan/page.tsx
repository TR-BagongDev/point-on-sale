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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Clock,
  User,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { OrderModificationDialog } from "@/components/order/OrderModificationDialog";

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
      id: string;
      name: string;
      price: number;
      category: {
        id: string;
        name: string;
        color: string | null;
      };
    };
  }[];
}

interface OrderModification {
  id: string;
  action: string;
  description: string;
  changes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
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
  const [editingOrder, setEditingOrder] = useState<LocalOrder | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<LocalOrder | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [modifications, setModifications] = useState<OrderModification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const handleEditOrder = (order: LocalOrder) => {
    setEditingOrder(order);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setEditingOrder(null);
    setShowEditDialog(false);
  };

  const handleOrderUpdated = () => {
    fetchOrders();
  };

  const handleViewOrder = async (order: LocalOrder) => {
    setViewingOrder(order);
    setShowDetailDialog(true);
    setLoadingHistory(true);

    try {
      const res = await fetch(`/api/order/${order.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setModifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch modification history:", error);
      toast.error("Gagal memuat riwayat modifikasi");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseDetailDialog = () => {
    setViewingOrder(null);
    setShowDetailDialog(false);
    setModifications([]);
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, { className: string; label: string }> = {
      ITEM_ADDED: {
        className: "bg-green-100 text-green-700 border-green-300",
        label: "Item Ditambahkan",
      },
      ITEM_REMOVED: {
        className: "bg-red-100 text-red-700 border-red-300",
        label: "Item Dihapus",
      },
      QUANTITY_CHANGED: {
        className: "bg-blue-100 text-blue-700 border-blue-300",
        label: "Jumlah Diubah",
      },
      STATUS_CHANGED: {
        className: "bg-purple-100 text-purple-700 border-purple-300",
        label: "Status Diubah",
      },
      NOTES_UPDATED: {
        className: "bg-orange-100 text-orange-700 border-orange-300",
        label: "Catatan Diubah",
      },
      ORDER_UPDATED: {
        className: "bg-cyan-100 text-cyan-700 border-cyan-300",
        label: "Pesanan Diubah",
      },
    };
    return styles[action] || {
      className: "bg-gray-100 text-gray-700 border-gray-300",
      label: action,
    };
  };

  return (
    <DashboardLayout>
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
                                onClick={() => handleViewOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {order.status === "PENDING" || order.status === "PREPARING" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit Pesanan"
                                  onClick={() => handleEditOrder(order)}
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

      {/* Order Modification Dialog */}
      {editingOrder && (
        <OrderModificationDialog
          order={editingOrder}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onOrderUpdated={handleOrderUpdated}
        />
      )}

      {/* Order Detail Dialog */}
      {viewingOrder && (
        <Dialog open={showDetailDialog} onOpenChange={handleCloseDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl">
                  Detail Pesanan {viewingOrder.orderNumber}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseDetailDialog}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
              <div className="space-y-6">
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informasi Pesanan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Waktu</p>
                        <p className="font-medium">{formatDate(viewingOrder.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Kasir</p>
                        <p className="font-medium">{viewingOrder.user.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Metode Pembayaran</p>
                        <Badge className={getPaymentBadge(viewingOrder.paymentMethod)}>
                          {viewingOrder.paymentMethod}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={getStatusBadge(viewingOrder.status).className}>
                          {getStatusBadge(viewingOrder.status).label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Menu</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.menu.name}</p>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <FileText className="h-3 w-3 inline mr-1" />
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {viewingOrder.notes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-800">
                          <FileText className="h-4 w-4 inline mr-2" />
                          Catatan Pesanan:
                        </p>
                        <p className="text-sm text-blue-700 mt-1">{viewingOrder.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Totals */}
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(viewingOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pajak (10%)</span>
                        <span className="font-medium">{formatCurrency(viewingOrder.tax)}</span>
                      </div>
                      {viewingOrder.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Diskon</span>
                          <span className="font-medium">-{formatCurrency(viewingOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(viewingOrder.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Modification History */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Riwayat Modifikasi</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingHistory ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Memuat riwayat modifikasi...
                      </div>
                    ) : modifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Tidak ada riwayat modifikasi</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {modifications.map((mod) => {
                            const actionBadge = getActionBadge(mod.action);
                            return (
                              <div
                                key={mod.id}
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className={actionBadge.className}>
                                        {actionBadge.label}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {formatDate(mod.createdAt)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{mod.user.name}</span>
                                      <span className="text-muted-foreground">
                                        ({mod.user.email})
                                      </span>
                                    </div>
                                    <p className="text-sm">{mod.description}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
