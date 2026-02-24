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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";

interface ShiftOrder {
  total: number;
  status: string;
}

interface ShiftData {
  id: string;
  startingCash: number;
  orders: ShiftOrder[];
}

interface ShiftCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftClosed: () => void;
  shift: ShiftData | null;
}

export function ShiftCloseDialog({
  open,
  onOpenChange,
  onShiftClosed,
  shift,
}: ShiftCloseDialogProps) {
  const [endingCash, setEndingCash] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate total sales from completed orders
  const totalSales = shift?.orders
    .filter((order) => order.status === "COMPLETED")
    .reduce((sum, order) => sum + order.total, 0) || 0;

  // Calculate expected cash
  const expectedCash = shift ? shift.startingCash + totalSales : 0;

  // Calculate discrepancy in real-time
  const discrepancy = endingCash
    ? parseInt(endingCash) - expectedCash
    : null;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setEndingCash("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shift) {
      toast.error("Data shift tidak tersedia");
      return;
    }

    const cashValue = parseInt(endingCash);
    if (isNaN(cashValue) || cashValue < 0) {
      toast.error("Jumlah kas akhir tidak valid");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/shift/${shift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endingCash: cashValue,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        const discrepancyValue = discrepancy || 0;
        const discrepancyMsg =
          discrepancyValue === 0
            ? "Kas pas"
            : discrepancyValue > 0
            ? `Kelebihan ${formatCurrency(discrepancyValue)}`
            : `Kekurangan ${formatCurrency(Math.abs(discrepancyValue))}`;

        toast.success("Shift berhasil ditutup", {
          description: `Kas akhir: ${formatCurrency(cashValue)} (${discrepancyMsg})`,
        });
        setEndingCash("");
        setNotes("");
        onOpenChange(false);
        onShiftClosed();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal menutup shift");
      }
    } catch (error) {
      console.error("Failed to close shift:", error);
      toast.error("Gagal menutup shift");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEndingCash("");
    setNotes("");
    onOpenChange(false);
  };

  const getDiscrepancyBadge = () => {
    if (discrepancy === null) {
      return null;
    }

    if (discrepancy === 0) {
      return (
        <div className="flex items-center gap-1 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">Pas</span>
        </div>
      );
    }

    if (discrepancy > 0) {
      return (
        <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">
            +{formatCurrency(discrepancy)}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">{formatCurrency(discrepancy)}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tutup Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Expected Cash Display */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kas Awal:</span>
                <span className="font-medium">
                  {formatCurrency(shift?.startingCash || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Penjualan:</span>
                <span className="font-medium">
                  {formatCurrency(totalSales)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Kas yang Diharapkan:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(expectedCash)}
                </span>
              </div>
            </div>

            {/* Ending Cash Input */}
            <div className="grid gap-2">
              <Label htmlFor="endingCash">Kas Akhir</Label>
              <Input
                id="endingCash"
                type="number"
                placeholder="0"
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                disabled={submitting}
                autoFocus
                min="0"
                step="1000"
              />
              <p className="text-xs text-muted-foreground">
                Masukkan jumlah uang tunai yang ada di kasir saat menutup shift
              </p>
            </div>

            {/* Discrepancy Display */}
            {discrepancy !== null && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Selisih:</span>
                {getDiscrepancyBadge()}
              </div>
            )}

            {/* Notes Input */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Masukkan catatan tentang shift ini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting || !endingCash}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Tutup Shift"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
