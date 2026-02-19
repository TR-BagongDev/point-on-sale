"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import type { ItemSalesData } from "@/lib/analytics";

interface TopSellingItemsProps {
  topItems: ItemSalesData[];
  bottomItems: ItemSalesData[];
  className?: string;
}

export function TopSellingItems({
  topItems,
  bottomItems,
  className,
}: TopSellingItemsProps) {
  const [showTop, setShowTop] = React.useState(true);

  const formatQuantity = (value: number): string => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const currentData = showTop ? topItems : bottomItems;
  const hasData = currentData && currentData.length > 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {showTop ? "Item Terlaris" : "Item Terendah"}
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTop(true)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                showTop
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Terlaris
            </button>
            <button
              onClick={() => setShowTop(false)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                !showTop
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Terendah
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Nama Item</TableHead>
                <TableHead className="text-right">Jumlah Terjual</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((item, index) => (
                <TableRow key={item.menuId}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item.menuName}</TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(item.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Tidak ada data tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
}
