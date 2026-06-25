"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import {
  ShoppingBag, Clock, CheckCircle2, Truck, Banknote,
  TrendingUp, Users, Building2, Activity as ActivityIcon,
  Plus, UserPlus, Package, Receipt, Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { generateSalesData, generateDailyData } from "@/lib/mock-data";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/types";

export default function Dashboard() {
  const {
    orders, customers, employees, branches, activities, currency,
  } = usePOSStore();
  const stats = usePOSStore((s) => s.getStats)();

  const salesData = generateSalesData();
  const dailyData = generateDailyData();

  // Top customers by spending
  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // Branch performance (orders count per branch)
  const branchPerformance = branches.map((b) => {
    const branchOrders = orders.filter((o) => o.branchId === b.id);
    const revenue = branchOrders.reduce((sum, o) => sum + o.paid, 0);
    return { name: b.name.split(" - ")[0], orders: branchOrders.length, revenue };
  });

  // Status distribution
  const statusData = ORDER_STATUSES.map((s) => ({
    name: s.label,
    value: orders.filter((o) => o.status === s.value).length,
    color: s.color.replace("bg-", ""),
  })).filter((s) => s.value > 0);

  const STATUS_COLORS = ["#3b82f6", "#06b6d4", "#6366f1", "#8b5cf6", "#f59e0b", "#10b981", "#f97316", "#16a34a"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-400" />
            Mr Laundry — Quality Dry Cleaner Service
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back! Here's what's happening with your shop today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Order
          </Link>
          <Link href="/customers" className="btn-secondary">
            <UserPlus className="w-4 h-4" /> Walk-in
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="!p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Plus,    label: "New Order",      color: "from-primary-500 to-primary-700",   href: "/orders/new" },
            { icon: UserPlus,label: "Walk-in",        color: "from-emerald-500 to-emerald-700",   href: "/customers" },
            { icon: Package, label: "Pickup Request", color: "from-violet-500 to-violet-700",     href: "/orders" },
            { icon: Truck,   label: "Delivery Order", color: "from-amber-500 to-amber-700",       href: "/orders" },
            { icon: Receipt, label: "Print Receipt",  color: "from-rose-500 to-rose-700",         href: "/orders" },
          ].map((qa) => {
            const Icon = qa.icon;
            return (
              <Link
                key={qa.label}
                href={qa.href}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-br ${qa.color} text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold text-center">{qa.label}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Today's Orders"
          value={stats.todayOrders.toString()}
          trend="+12%"
          gradient="from-primary-500 to-primary-700"
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={stats.pendingOrders.toString()}
          trend="In Progress"
          gradient="from-amber-500 to-amber-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="Ready for Delivery"
          value={stats.readyForDelivery.toString()}
          trend="Awaiting"
          gradient="from-emerald-500 to-emerald-700"
        />
        <StatCard
          icon={Truck}
          label="Delivered Today"
          value={stats.deliveredToday.toString()}
          trend="Completed"
          gradient="from-violet-500 to-violet-700"
        />
      </div>

      {/* Sales Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardSubtitle>Last 12 months performance</CardSubtitle>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue, currency)}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end mt-1">
                <TrendingUp className="w-3 h-3" /> +18.4% vs last month
              </p>
            </div>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3478f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3478f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15,23,42,0.95)",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3478f6" strokeWidth={3} fill="url(#revenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today's Sales</CardTitle>
              <CardSubtitle>Revenue collected today</CardSubtitle>
            </div>
            <Banknote className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <div className="text-center py-6">
            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.totalSalesToday, currency)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              from {stats.todayOrders} orders
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Avg Order</p>
              <p className="font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(stats.todayOrders ? Math.round(stats.totalSalesToday / stats.todayOrders) : 0, currency)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Items</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                {orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Chart + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>This Week</CardTitle>
              <CardSubtitle>Daily orders & revenue</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15,23,42,0.95)",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="orders" fill="#3478f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Order Status</CardTitle>
              <CardSubtitle>Current pipeline</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15,23,42,0.95)",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Customers + Branch Performance + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Customers */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Top Customers</CardTitle>
              <CardSubtitle>By total spending</CardSubtitle>
            </div>
            <Link href="/customers" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all →</Link>
          </CardHeader>
          <div className="space-y-3">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full grid place-items-center text-white text-xs font-bold ${
                  ["bg-amber-500", "bg-slate-400", "bg-amber-700"][i] || "bg-primary-500"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.membershipTier.toUpperCase()}</p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(c.totalSpent, currency)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Branch Performance</CardTitle>
              <CardSubtitle>Orders & revenue per branch</CardSubtitle>
            </div>
            <Link href="/branches" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View →</Link>
          </CardHeader>
          <div className="space-y-3">
            {branchPerformance.map((b, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-xs font-bold">{b.orders} orders</p>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-emerald-500"
                    style={{ width: `${Math.min(100, (b.orders / Math.max(...branchPerformance.map(x => x.orders), 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatCurrency(b.revenue, currency)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><ActivityIcon className="w-4 h-4" /> Recent Activities</CardTitle>
              <CardSubtitle>Real-time updates</CardSubtitle>
            </div>
          </CardHeader>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activities.slice(0, 10).map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  a.type === "order_created" ? "bg-primary-500" :
                  a.type === "order_status" ? "bg-amber-500" :
                  a.type === "delivery" ? "bg-emerald-500" :
                  a.type === "payment" ? "bg-violet-500" :
                  a.type === "customer_added" ? "bg-rose-500" :
                  "bg-slate-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{a.message}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{relativeTime(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon, label, value, trend, gradient,
}: {
  icon: any; label: string; value: string; trend: string; gradient: string;
}) {
  return (
    <Card hover className="!p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{trend}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}
