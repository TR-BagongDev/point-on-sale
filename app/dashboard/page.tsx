"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  Calendar,
  Download,
} from "lucide-react";
import { SalesTrendChart } from "@/components/analytics/SalesTrendChart";
import { SalesByHourChart } from "@/components/analytics/SalesByHourChart";
import { PaymentMethodPieChart } from "@/components/analytics/PaymentMethodPieChart";
import { TopSellingItems } from "@/components/analytics/TopSellingItems";
import { PeriodComparisonCards } from "@/components/analytics/PeriodComparisonCards";
import type {
  SalesTrendData,
  SalesByHourData,
  ItemSalesData,
  PeriodComparisonData,
} from "@/lib/analytics";

interface PaymentMethodData {
  method: string;
  total: number;
  orderCount: number;
}

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  averageOrder: number;
  menuSold: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  user: {
    name: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    averageOrder: 0,
    menuSold: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Analytics state
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [salesByHour, setSalesByHour] = useState<SalesByHourData[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<PaymentMethodData[]>([]);
  const [topItems, setTopItems] = useState<ItemSalesData[]>([]);
  const [bottomItems, setBottomItems] = useState<ItemSalesData[]>([]);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparisonData | null>(null);

  useEffect(() => {
    // Set default dates to today
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today);
    setDateTo(today);
  }, []);

  useEffect(() => {
    if (dateFrom) {
      fetchDashboardData();
    }
  }, [dateFrom, dateTo]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setAnalyticsLoading(true);
    setError(null);
    try {
      // Fetch orders for selected date range
      const params = new URLSearchParams({
        startDate: dateFrom,
        endDate: dateTo,
      });
      const res = await fetch(`/api/order?${params}`);

      if (!res.ok) {
        throw new Error('Gagal memuat data pesanan');
      }

      const orders = await res.json();

      // Calculate stats
      const todaySales = orders.reduce(
        (sum: number, order: RecentOrder) => sum + order.total,
        0
      );
      const todayOrders = orders.length;
      const averageOrder = todayOrders > 0 ? todaySales / todayOrders : 0;

      // Get last 5 orders
      setRecentOrders(orders.slice(0, 5));

      setStats({
        todaySales,
        todayOrders,
        averageOrder,
        menuSold: orders.reduce(
          (sum: number, order: { items: unknown[] }) => sum + order.items.length,
          0
        ),
      });

      // Fetch analytics data
      await fetchAnalyticsData();
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // Calculate previous period dates (same duration, immediately before)
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - dayDiff + 1);

      const analyticsParams = new URLSearchParams({
        startDate: dateFrom,
        endDate: dateTo,
        previousStartDate: prevStartDate.toISOString().split('T')[0],
        previousEndDate: prevEndDate.toISOString().split('T')[0],
      });

      const analyticsRes = await fetch(`/api/analytics?${analyticsParams}`);
      if (!analyticsRes.ok) {
        throw new Error('Gagal memuat data analitik');
      }

      const analytics = await analyticsRes.json();

      // Update state with analytics data
      setSalesTrend(analytics.salesTrend || []);
      setSalesByHour(analytics.salesByHour || []);

      // Transform payment distribution data to match PaymentMethodPieChart interface
      const transformedPaymentDistribution = (analytics.paymentDistribution || []).map((item: any) => ({
        method: item.paymentMethod,
        total: item.total,
        orderCount: item.orderCount,
      }));
      setPaymentDistribution(transformedPaymentDistribution);

      setTopItems(analytics.topItems || []);
      setBottomItems(analytics.bottomItems || []);
      setPeriodComparison(analytics.periodComparison || null);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      setError(error instanceof Error ? error.message : 'Gagal memuat data analitik');
      // Set empty arrays on error to prevent rendering issues
      setSalesTrend([]);
      setSalesByHour([]);
      setPaymentDistribution([]);
      setTopItems([]);
      setBottomItems([]);
      setPeriodComparison(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportToCSV = () => {
    const formatDateID = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    // Summary stats section
    const summaryRows = [
      ["Ringkasan Analitik"],
      [`Periode:`, `${dateFrom} ${dateTo !== dateFrom ? `- ${dateTo}` : ''}`],
      ["Total Penjualan", stats.todaySales.toString()],
      ["Total Pesanan", stats.todayOrders.toString()],
      ["Rata-rata Pesanan", stats.averageOrder.toString()],
      ["Menu Terjual", stats.menuSold.toString()],
      [],
    ];

    // Sales trend section
    const salesTrendHeaders = ["Tren Penjualan"];
    const salesTrendRows = salesTrend.map((trend) => [
      formatDateID(trend.date),
      trend.total.toString(),
      trend.orderCount.toString(),
    ]);

    // Sales by hour section
    const salesByHourHeaders = ["Penjualan per Jam"];
    const salesByHourRows = salesByHour.map((hour) => [
      `${hour.hour}:00`,
      hour.total.toString(),
      hour.orderCount.toString(),
    ]);

    // Payment distribution section
    const paymentHeaders = ["Distribusi Pembayaran"];
    const totalPaymentAmount = paymentDistribution.reduce((sum, p) => sum + p.total, 0);
    const paymentRows = paymentDistribution.map((payment) => [
      payment.method,
      payment.total.toString(),
      payment.orderCount.toString(),
      totalPaymentAmount > 0 ? `${((payment.total / totalPaymentAmount) * 100).toFixed(1)}%` : '0%',
    ]);

    // Top items section
    const topItemsHeaders = ["Menu Terlaris"];
    const topItemsRows = topItems.map((item) => [
      item.menuName,
      item.quantity.toString(),
      item.revenue.toString(),
    ]);

    // Period comparison section
    const comparisonRows = [];
    if (periodComparison) {
      comparisonRows.push(
        ["Perbandingan Periode"],
        ["Metrik", "Periode Saat Ini", "Periode Sebelumnya", "Pertumbuhan"],
        ["Penjualan", periodComparison.currentPeriod.totalSales.toString(), periodComparison.previousPeriod.totalSales.toString(), `${periodComparison.growth.salesGrowth > 0 ? '+' : ''}${periodComparison.growth.salesGrowth.toFixed(1)}%`],
        ["Pesanan", periodComparison.currentPeriod.orderCount.toString(), periodComparison.previousPeriod.orderCount.toString(), `${periodComparison.growth.orderCountGrowth > 0 ? '+' : ''}${periodComparison.growth.orderCountGrowth.toFixed(1)}%`],
        ["Rata-rata", periodComparison.currentPeriod.averageOrderValue.toString(), periodComparison.previousPeriod.averageOrderValue.toString(), `${periodComparison.growth.aovGrowth > 0 ? '+' : ''}${periodComparison.growth.aovGrowth.toFixed(1)}%`],
        []
      );
    }

    // Combine all sections
    const allRows = [
      ...summaryRows.map(row => row.join(",")),
      salesTrendHeaders[0],
      "Tanggal,Total,Pesanan",
      ...salesTrendRows.map(row => row.join(",")),
      "",
      salesByHourHeaders[0],
      "Jam,Total,Pesanan",
      ...salesByHourRows.map(row => row.join(",")),
      "",
      paymentHeaders[0],
      "Metode,Total,Jumlah,Persentase",
      ...paymentRows.map(row => row.join(",")),
      "",
      topItemsHeaders[0],
      "Menu,Jumlah,Pendapatan",
      ...topItemsRows.map(row => row.join(",")),
      "",
      ...comparisonRows,
    ];

    const csvContent = allRows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analitik-${dateFrom}${dateTo !== dateFrom ? `-${dateTo}` : ''}.csv`;
    link.click();
  };

  // Determine if showing single day or date range
  const isSingleDay = dateFrom === dateTo;
  const periodLabel = isSingleDay ? "Hari Ini" : "Periode Ini";

  const statCards = [
    {
      title: `Penjualan ${periodLabel}`,
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: `Pesanan ${periodLabel}`,
      value: stats.todayOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Rata-rata Pesanan",
      value: formatCurrency(stats.averageOrder),
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Menu Terjual",
      value: stats.menuSold.toString(),
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <DashboardLayout userName="Admin" userRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Selamat datang di Warung POS Dashboard
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline" disabled={loading || analyticsLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export Analitik
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Dari:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                  disabled={loading}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sampai:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                  disabled={loading}
                />
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Memuat data...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Period Comparison Cards */}
        {periodComparison && !analyticsLoading && (
          <PeriodComparisonCards data={periodComparison} />
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            // Loading skeletons
            statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                      <div className="h-8 bg-muted animate-pulse rounded w-20"></div>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor} animate-pulse`}>
                      <div className="h-6 w-6 bg-muted/50 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Actual stats
            statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {analyticsLoading ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Tren Penjualan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Penjualan per Jam</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <SalesTrendChart data={salesTrend} />
              <SalesByHourChart data={salesByHour} />
            </>
          )}
        </div>

        {/* Items and Payment Distribution */}
        <div className="grid gap-4 md:grid-cols-2">
          {analyticsLoading ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Menu Terlaris</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Distribusi Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <TopSellingItems
                topItems={topItems}
                bottomItems={bottomItems}
              />
              <PaymentMethodPieChart data={paymentDistribution} />
            </>
          )}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pesanan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada pesanan untuk periode ini
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold">
                        {order.orderNumber.slice(-3)}
                      </div>
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          oleh {order.user.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
