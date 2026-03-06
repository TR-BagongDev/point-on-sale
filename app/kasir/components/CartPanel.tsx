"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { type CartItem } from "@/store/cart";
import { SyncStatusIndicator } from "@/components/offline/SyncStatusIndicator";
import { ShiftStatusIndicator } from "@/components/shift/ShiftStatusIndicator";
import {
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartPanelProps {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    taxRate: number;
    discount: number;
    simpleMode: boolean;
    pendingCount: number;
    shiftLoading: boolean;
    currentShiftName: string | undefined;
    syncStatus: "online" | "offline" | "syncing" | "pending";
    shiftStatus: "open" | "closed" | "none";
    onUpdateQuantity: (id: string, quantity: number) => void;
    onUpdateNotes: (id: string, notes: string) => void;
    onRemoveItem: (id: string) => void;
    onDiscountChange: (discount: number) => void;
    onQuickCheckout: () => void;
    onShowCheckout: () => void;
    onOpenShift: () => void;
    getItemCount: () => number;
}

export function CartPanel({
    items,
    subtotal,
    tax,
    total,
    taxRate,
    discount,
    simpleMode,
    pendingCount,
    shiftLoading,
    currentShiftName,
    syncStatus,
    shiftStatus,
    onUpdateQuantity,
    onUpdateNotes,
    onRemoveItem,
    onDiscountChange,
    onQuickCheckout,
    onShowCheckout,
    onOpenShift,
    getItemCount,
}: CartPanelProps) {
    return (
        <Card className="w-96 flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Keranjang
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <ShiftStatusIndicator
                            status={shiftStatus}
                            shiftName={currentShiftName}
                        />
                        <SyncStatusIndicator status={syncStatus} />
                        {items.length > 0 && (
                            <Badge variant="secondary">{getItemCount()} item</Badge>
                        )}
                    </div>
                </div>
                {pendingCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                        {pendingCount} pesanan menunggu sinkronisasi
                    </p>
                )}
                {!shiftLoading && shiftStatus === "none" && (
                    <Button
                        className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                        onClick={onOpenShift}
                    >
                        Buka Shift
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                {items.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Keranjang kosong</p>
                            <p className="text-sm">Klik menu untuk menambahkan</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 px-6">
                            <div className="space-y-3">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3 py-2 border-b pb-3 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatCurrency(item.price)}
                                            </p>
                                            <Input
                                                type="text"
                                                placeholder="Catatan..."
                                                value={item.notes || ""}
                                                onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                                                className="mt-2 h-8 text-xs"
                                                maxLength={100}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-12 w-12"
                                                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Kurangi jumlah</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <span className="w-10 text-center text-base font-medium">
                                                {item.quantity}
                                            </span>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-12 w-12"
                                                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Tambah jumlah</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-12 w-12 text-destructive hover:text-destructive"
                                                        onClick={() => onRemoveItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Hapus item</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="p-6 border-t">
                            {/* Discount Input - Hidden in Simple Mode */}
                            {!simpleMode && (
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-sm text-muted-foreground">Diskon:</span>
                                    <Input
                                        type="number"
                                        value={discount || ""}
                                        onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                                        className="h-8 w-24"
                                        placeholder="0"
                                    />
                                </div>
                            )}

                            <Separator className="my-3" />

                            {/* Summary */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pajak ({taxRate}%)</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-secondary-600">
                                        <span>Diskon</span>
                                        <span>-{formatCurrency(discount)}</span>
                                    </div>
                                )}
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-primary-600">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            className="w-full h-12 text-lg bg-primary-600 hover:bg-primary-700 shadow-lg"
                                            onClick={onQuickCheckout}
                                        >
                                            <Zap className="mr-2 h-5 w-5" />
                                            Bayar Sekarang
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Bayar dengan tunai (cepat)</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-10 text-sm"
                                            onClick={onShowCheckout}
                                        >
                                            Pilih Metode Lain
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Pilih QRIS atau Debit</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
