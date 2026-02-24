"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Clock, UserCheck, UserX, DollarSign, AlertCircle, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ShiftOpenDialog } from "./components/ShiftOpenDialog";

interface ShiftOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
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

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await fetch("/api/shift");
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data = await res.json();
      setShifts(data);
    } catch (error) {
      toast.error("Gagal memuat shift", {
        description: "Terjadi kesalahan saat mengambil data shift",
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen Shift</h1>
            <p className="text-muted-foreground">
              Kelola shift kasir dan lacak transaksi
            </p>
          </div>
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Buka Shift
          </Button>
        </div>

        {/* Shifts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daftar Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada shift
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Kasir
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Kas Awal
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Kas Akhir
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Selisih
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Jumlah Pesanan
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Waktu Buka
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                        Waktu Tutup
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr
                        key={shift.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{shift.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {shift.user.role === "ADMIN" ? "Admin" : "Kasir"}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(shift.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {formatCurrency(shift.startingCash)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {shift.endingCash !== null
                              ? formatCurrency(shift.endingCash)
                              : "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getDiscrepancyBadge(shift.discrepancy)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {shift.orders.length}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(shift.openedAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(shift.closedAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ShiftOpenDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onShiftOpened={fetchShifts}
      />
    </DashboardLayout>
  );
}
