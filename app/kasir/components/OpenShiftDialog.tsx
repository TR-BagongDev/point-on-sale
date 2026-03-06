"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface OpenShiftDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenShift: (startingCash: number) => void;
}

export function OpenShiftDialog({
    open,
    onOpenChange,
    onOpenShift,
}: OpenShiftDialogProps) {
    const [startingCash, setStartingCash] = useState("");

    const handleSubmit = () => {
        const cash = Math.round(Number(startingCash));
        if (!isNaN(cash) && cash >= 0) {
            onOpenShift(cash);
            setStartingCash("");
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setStartingCash("");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Buka Shift Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Modal Awal
                        </label>
                        <Input
                            type="number"
                            placeholder="Masukkan modal awal"
                            value={startingCash}
                            onChange={(e) => setStartingCash(e.target.value)}
                            min="0"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Masukkan jumlah uang tunai yang ada di kasir saat memulai shift
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                    >
                        Batal
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!startingCash}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                        Buka Shift
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
