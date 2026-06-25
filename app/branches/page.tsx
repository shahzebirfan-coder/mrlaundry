"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Building2, Phone, MapPin, Plus, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function BranchesPage() {
  const { branches, orders, currency } = usePOSStore();

  const branchData = branches.map((b) => {
    const branchOrders = orders.filter((o) => o.branchId === b.id);
    const revenue = branchOrders.reduce((s, o) => s + o.paid, 0);
    const items = branchOrders.reduce((s, o) => s + o.items.reduce((sum, i) => sum + i.quantity, 0), 0);
    return { ...b, orders: branchOrders.length, revenue, items };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary-600" /> Branches
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multi-branch management & performance
          </p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" /> Add Branch</button>
      </div>

      {/* Branch Performance Chart */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>📊 Branch Performance Comparison</CardTitle>
            <CardSubtitle>Revenue across all locations</CardSubtitle>
          </div>
        </CardHeader>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }}
                formatter={(v: number) => formatCurrency(v, currency)}
              />
              <Bar dataKey="revenue" fill="#3478f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branchData.map((b) => (
          <Card key={b.id} hover>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 grid place-items-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold">{b.name}</p>
                  <span className={`badge ${b.active ? "badge-success" : "badge-neutral"}`}>
                    {b.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {b.address && (
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-xs">{b.address}</span>
                </div>
              )}
              {b.mobile && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs">{b.mobile}</span>
                </div>
              )}
              {b.manager && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-xs">👤 Manager: <strong>{b.manager}</strong></span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Orders</p>
                <p className="font-bold text-sm">{b.orders}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Items</p>
                <p className="font-bold text-sm">{b.items}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Revenue</p>
                <p className="font-bold text-sm text-emerald-600">{formatCurrency(b.revenue, currency)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
