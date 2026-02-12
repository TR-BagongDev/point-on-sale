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
import { cn } from "@/lib/utils";

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
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
    }).format(date);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatTooltip = (payload: any) => {
    if (!payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-semibold">{formatDate(data.date)}</p>
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
        <CardTitle>Tren Penjualan</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis
                tickFormatter={formatCurrency}
                className="text-xs"
                width={100}
              />
              <Tooltip content={formatTooltip} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Tidak ada data tersedia
          </div>
        )}
      </CardContent>
    </Card>
  );
}
