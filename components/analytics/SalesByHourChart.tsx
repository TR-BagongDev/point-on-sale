"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

export interface SalesByHourData {
  hour: number;
  total: number;
  orderCount: number;
}

interface SalesByHourChartProps {
  data: SalesByHourData[];
  className?: string;
}

export function SalesByHourChart({ data, className }: SalesByHourChartProps) {
  const formatHour = (hour: number): string => {
    return `${hour}:00`;
  };

  const formatTooltip = (payload: any) => {
    if (!payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-semibold">{`${data.hour}:00 - ${data.hour}:59`}</p>
        <p className="text-sm text-muted-foreground">
          Penjualan: {formatCurrency(data.total)}
        </p>
        <p className="text-sm text-muted-foreground">
          Pesanan: {data.orderCount} order
        </p>
      </div>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Penjualan per Jam</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  className="text-xs"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  className="text-xs hidden sm:block"
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={formatTooltip} />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
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
