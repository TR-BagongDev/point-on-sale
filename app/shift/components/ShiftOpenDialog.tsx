"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";

interface ShiftOpenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftOpened: () => void;
}

export function ShiftOpenDialog({
  open,
  onOpenChange,
  onShiftOpened,
}: ShiftOpenDialogProps) {
  const [startingCash, setStartingCash] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cashValue = parseInt(startingCash);
    if (isNaN(cashValue) || cashValue < 0) {
      toast.error("Jumlah kas awal tidak valid");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startingCash: cashValue,
        }),
      });

      if (res.ok) {
        toast.success("Shift berhasil dibuka", {
          description: `Kas awal: ${formatCurrency(cashValue)}`,
        });
        setStartingCash("");
        onOpenChange(false);
        onShiftOpened();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal membuka shift");
      }
    } catch (error) {
      console.error("Failed to open shift:", error);
      toast.error("Gagal membuka shift");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStartingCash("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Buka Shift Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startingCash">Kas Awal</Label>
              <Input
                id="startingCash"
                type="number"
                placeholder="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                disabled={submitting}
                autoFocus
                min="0"
                step="1000"
              />
              <p className="text-xs text-muted-foreground">
                Masukkan jumlah uang tunai yang ada di kasir saat memulai shift
              </p>
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
            <Button type="submit" disabled={submitting || !startingCash}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Buka Shift"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
