"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { UserCog, Clock, TrendingUp, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  washer: "Washer",
  iron_man: "Iron Man",
  delivery_rider: "Delivery Rider",
};

const ROLE_COLORS = {
  admin: "from-violet-500 to-violet-700",
  manager: "from-primary-500 to-primary-700",
  cashier: "from-emerald-500 to-emerald-700",
  washer: "from-cyan-500 to-cyan-700",
  iron_man: "from-amber-500 to-amber-700",
  delivery_rider: "from-rose-500 to-rose-700",
};

export default function EmployeesPage() {
  const { employees, currency } = usePOSStore();
  const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0);
  const avgProductivity = Math.round(
    employees.reduce((sum, e) => sum + e.productivityScore, 0) / employees.length
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Employee Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage staff roles, attendance, and performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 grid place-items-center">
              <UserCog className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Staff</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg Performance</p>
              <p className="text-2xl font-bold">{avgProductivity}%</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 grid place-items-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Monthly Payroll</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSalary, currency)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 grid place-items-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Today</p>
              <p className="text-2xl font-bold">{employees.filter(e => e.active).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((e) => (
          <Card key={e.id} hover>
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${ROLE_COLORS[e.role]} grid place-items-center text-white font-bold`}>
                {e.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-bold">{e.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{e.mobile}</p>
                <span className="badge-info mt-1 !text-[10px]">{ROLE_LABELS[e.role]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Salary</span>
                <span className="font-semibold">{formatCurrency(e.salary, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Orders Processed</span>
                <span className="font-semibold">{e.ordersProcessed}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Productivity</span>
                  <span className="font-bold text-primary-600">{e.productivityScore}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-500" style={{ width: `${e.productivityScore}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Joined</span>
                <span>{new Date(e.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
