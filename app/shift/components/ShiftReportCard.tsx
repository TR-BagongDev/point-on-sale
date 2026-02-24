"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { UserCheck, UserX, DollarSign, AlertCircle, ShoppingCart, Clock } from "lucide-react";

interface ShiftOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
}

interface ShiftUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Shift {
  id: string;
  userId: string;
  status: string;
  startingCash: number;
  endingCash: number | null;
  expectedCash: number | null;
  discrepancy: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: ShiftUser;
  orders: ShiftOrder[];
}

interface ShiftReportCardProps {
  shift: Shift;
  className?: string;
}

export function ShiftReportCard({ shift, className }: ShiftReportCardProps) {
  const getStatusBadge = (status: string) => {
    if (status === "OPEN") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <UserCheck className="h-3 w-3 mr-1" />
          Aktif
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        <UserX className="h-3 w-3 mr-1" />
        Ditutup
      </Badge>
    );
  };

  const getDiscrepancyBadge = (discrepancy: number | null) => {
    if (discrepancy === null) {
      return (
        <Badge variant="outline" className="text-gray-500">
          -
        </Badge>
      );
    }

    if (discrepancy === 0) {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <DollarSign className="h-3 w-3 mr-1" />
          Pas
        </Badge>
      );
    }

    if (discrepancy > 0) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <DollarSign className="h-3 w-3 mr-1" />
          +{formatCurrency(discrepancy)}
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <AlertCircle className="h-3 w-3 mr-1" />
        {formatCurrency(discrepancy)}
      </Badge>
    );
  };

  const completedOrders = shift.orders.filter(order => order.status === "COMPLETED");
  const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg">
              {shift.user.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {shift.user.role === "ADMIN" ? "Admin" : "Kasir"}
            </p>
          </div>
          {getStatusBadge(shift.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cash Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Kas Awal</span>
            <span className="font-medium">{formatCurrency(shift.startingCash)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Kas Akhir</span>
            <span className="font-medium">
              {shift.endingCash !== null ? formatCurrency(shift.endingCash) : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selisih</span>
            {getDiscrepancyBadge(shift.discrepancy)}
          </div>
        </div>

        {/* Orders Summary */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Jumlah Pesanan</span>
          </div>
          <span className="text-lg font-bold">{shift.orders.length}</span>
        </div>

        {/* Total Sales */}
        {completedOrders.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Penjualan</span>
            <span className="font-semibold">{formatCurrency(totalSales)}</span>
          </div>
        )}

        {/* Time Information */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Buka:</span>
                <span className="font-medium">{formatDate(shift.openedAt)}</span>
              </div>
              {shift.closedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tutup:</span>
                  <span className="font-medium">{formatDate(shift.closedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {shift.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Catatan:</span> {shift.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
