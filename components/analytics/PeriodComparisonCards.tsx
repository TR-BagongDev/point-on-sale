"use client";

import * as React from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { PeriodComparisonData } from "@/lib/analytics";

interface PeriodComparisonCardsProps {
  data: PeriodComparisonData;
  className?: string;
}

export function PeriodComparisonCards({
  data,
  className,
}: PeriodComparisonCardsProps) {
  const formatGrowth = (growth: number): string => {
    const sign = growth > 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}%`;
  };

  const GrowthIndicator = ({ growth }: { growth: number }) => (
    <div
      className={cn(
        "flex items-center gap-1 text-sm font-medium",
        growth >= 0 ? "text-green-600" : "text-red-600"
      )}
    >
      {growth >= 0 ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      )}
      <span>{formatGrowth(growth)}</span>
    </div>
  );

  const comparisonCards = [
    {
      title: "Total Penjualan",
      value: formatCurrency(data.currentPeriod.totalSales),
      growth: data.growth.salesGrowth,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Jumlah Pesanan",
      value: data.currentPeriod.orderCount.toString(),
      growth: data.growth.orderCountGrowth,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Rata-rata Pesanan",
      value: formatCurrency(data.currentPeriod.averageOrderValue),
      growth: data.growth.aovGrowth,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {comparisonCards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <div className="mt-2">
                  <GrowthIndicator growth={card.growth} />
                </div>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
