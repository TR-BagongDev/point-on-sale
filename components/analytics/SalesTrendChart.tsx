"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDateID } from "@/lib/utils";

export interface SalesTrendData {
  date: string;
  total: number;
  orderCount: number;
  averageOrderValue: number;
}

interface SalesTrendChartProps {
  data: SalesTrendData[];
  className?: string;
}

export function SalesTrendChart({ data, className }: SalesTrendChartProps) {
  const formatTooltip = (payload: any) => {
    if (!payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-semibold">{formatDateID(data.date)}</p>
        <p className="text-sm text-muted-foreground">
          Penjualan: {formatCurrency(data.total)}
        </p>
        <p className="text-sm text-muted-foreground">
          Pesanan: {data.orderCount} order
        </p>
        <p className="text-sm text-muted-foreground">
          Rata-rata: {formatCurrency(data.averageOrderValue)}
        </p>
      </div>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Tren Penjualan</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateID}
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  className="text-xs hidden sm:block"
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={formatTooltip} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
            Tidak ada data tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
}
