"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export default function AccountingPage() {
  const { orders, currency, employees } = usePOSStore();

  // Income breakdown
  const cashIncome = orders.filter(o => o.paymentMethod === "cash").reduce((s, o) => s + o.paid, 0);
  const cardIncome = orders.filter(o => o.paymentMethod === "card").reduce((s, o) => s + o.paid, 0);
  const onlineIncome = orders.filter(o => o.paymentMethod === "online").reduce((s, o) => s + o.paid, 0);
  const creditIncome = orders.filter(o => o.paymentMethod === "credit").reduce((s, o) => s + o.paid, 0);

  const totalIncome = cashIncome + cardIncome + onlineIncome;
  const totalSalary = employees.reduce((s, e) => s + e.salary, 0);
  const totalExpenses = totalSalary + 45000; // + rent + utilities
  const profit = totalIncome - totalExpenses;

  const incomeBreakdown = [
    { name: "Cash", value: cashIncome, color: "#10b981" },
    { name: "Card", value: cardIncome, color: "#3478f6" },
    { name: "Online", value: onlineIncome, color: "#8b5cf6" },
  ].filter(i => i.value > 0);

  const expensesBreakdown = [
    { name: "Salaries", amount: totalSalary, color: "#3478f6" },
    { name: "Rent", amount: 25000, color: "#8b5cf6" },
    { name: "Utilities", amount: 12000, color: "#10b981" },
    { name: "Chemicals", amount: 8000, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">💰 Accounting</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track income, expenses, and profit/loss
        </p>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalIncome, currency)}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +24% this month
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses, currency)}</p>
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3" /> +5% this month
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 grid place-items-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${profit > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(profit, currency)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Margin: {totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 grid place-items-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>💵 Income Breakdown</CardTitle>
              <CardSubtitle>By payment method</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incomeBreakdown} innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {incomeBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>📊 Expense Breakdown</CardTitle>
              <CardSubtitle>Where money goes</CardSubtitle>
            </div>
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "none", borderRadius: "12px", color: "#fff" }}
                  formatter={(v: number) => formatCurrency(v, currency)}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {expensesBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>📋 Recent Transactions</CardTitle>
            <CardSubtitle>Last 10 payments received</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-2">
          {orders.slice(0, 10).map((o) => (
            <div key={o.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl grid place-items-center ${
                  o.paymentMethod === "cash" ? "bg-emerald-100 text-emerald-700" :
                  o.paymentMethod === "card" ? "bg-primary-100 text-primary-700" :
                  o.paymentMethod === "online" ? "bg-violet-100 text-violet-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {o.paymentMethod === "cash" ? <DollarSign className="w-5 h-5" /> :
                   o.paymentMethod === "card" ? <CreditCard className="w-5 h-5" /> :
                   <Wallet className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{o.id} • {o.customerName}</p>
                  <p className="text-xs text-slate-500 capitalize">{o.paymentMethod}</p>
                </div>
              </div>
              <p className="font-bold text-emerald-600">+{formatCurrency(o.paid, currency)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
