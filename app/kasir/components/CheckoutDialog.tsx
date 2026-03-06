"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Banknote, QrCode, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CheckoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    total: number;
    orderNotes: string;
    onNotesChange: (notes: string) => void;
    onCheckout: (paymentMethod: string) => void;
    isCheckingOut: boolean;
    simpleMode: boolean;
}

export function CheckoutDialog({
    open,
    onOpenChange,
    total,
    orderNotes,
    onNotesChange,
    onCheckout,
    isCheckingOut,
    simpleMode,
}: CheckoutDialogProps) {
    const paymentMethods = [
        { method: "CASH", label: "Tunai", icon: Banknote, tooltip: "Bayar dengan uang tunai" },
        { method: "QRIS", label: "QRIS", icon: QrCode, tooltip: "Scan QR untuk pembayaran" },
        { method: "DEBIT", label: "Debit", icon: CreditCard, tooltip: "Bayar dengan kartu debit" },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
                </DialogHeader>
                {/* Order Notes - Hidden in Simple Mode */}
                {!simpleMode && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Catatan Pesanan</label>
                            <Textarea
                                placeholder="Tambahkan catatan untuk pesanan ini..."
                                value={orderNotes}
                                onChange={(e) => onNotesChange(e.target.value)}
                                maxLength={200}
                                rows={3}
                            />
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-3 gap-3 py-4">
                    {paymentMethods.map(({ method, label, icon: Icon, tooltip }) => (
                        <Tooltip key={method}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="h-24 flex-col gap-2"
                                    onClick={() => onCheckout(method)}
                                    disabled={isCheckingOut}
                                >
                                    {isCheckingOut ? (
                                        <>
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon className="h-8 w-8" />
                                            <span>{label}</span>
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-primary-600">{formatCurrency(total)}</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Batal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
