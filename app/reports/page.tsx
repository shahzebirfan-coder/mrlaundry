"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Download, FileText, TrendingUp, Users, Building2 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { generateSalesData, generateDailyData } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_TYPES } from "@/lib/types";

export default function ReportsPage() {
  const { orders, customers, employees, currency, branches } = usePOSStore();
  const salesData = generateSalesData();
  const dailyData = generateDailyData();

  // Service-wise sales
  const serviceWise = SERVICE_TYPES.map((s) => {
    let revenue = 0;
    let count = 0;
    orders.forEach((o) => {
      o.items.forEach((i) => {
        if (i.serviceType === s.value) {
          revenue += s.price * i.quantity;
          count += i.quantity;
        }
      });
    });
    return { name: s.label, revenue, count };
  });

  // Customer-wise sales
  const customerWise = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map((c) => ({ name: c.name, spent: c.totalSpent, orders: orders.filter(o => o.customerId === c.id).length }));

  // Employee performance
  const employeeWise = employees
    .sort((a, b) => b.ordersProcessed - a.ordersProcessed)
    .slice(0, 5)
    .map((e) => ({ name: e.name, orders: e.ordersProcessed, score: e.productivityScore }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Advanced Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive analytics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><FileText className="w-4 h-4" /> PDF</button>
          <button className="btn-secondary"><Download className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(orders.reduce((s, o) => s + o.paid, 0), currency), icon: TrendingUp, color: "from-primary-500 to-primary-700" },
          { label: "Total Orders", value: orders.length.toString(), icon: FileText, color: "from-emerald-500 to-emerald-700" },
          { label: "Customers", value: customers.length.toString(), icon: Users, color: "from-violet-500 to-violet-700" },
          { label: "Branches", value: branches.length.toString(), icon: Building2, color: "from-amber-500 to-amber-700" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} grid place-items-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>📈 Revenue Trend (12 months)</CardTitle>
              <CardSubtitle>Monthly performance overview</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3478f6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>🧺 Service-wise Sales</CardTitle>
              <CardSubtitle>Revenue by service type</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceWise}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>👥 Top Customers</CardTitle>
              <CardSubtitle>Highest spending customers</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerWise} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Bar dataKey="spent" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>👨‍💼 Employee Performance</CardTitle>
              <CardSubtitle>Orders processed & productivity</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeWise}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="orders" fill="#3478f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
