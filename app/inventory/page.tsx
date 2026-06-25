"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingDown, Plus, Edit2 } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const { inventory, currency } = usePOSStore();
  const [editing, setEditing] = useState<string | null>(null);

  const lowStock = inventory.filter((i) => i.quantity <= i.minStock);
  const totalValue = inventory.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Inventory Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track stock levels and get low-stock alerts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 grid place-items-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Items</p>
              <p className="text-2xl font-bold">{inventory.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 grid place-items-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-amber-600">{lowStock.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue, currency)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="!p-4 border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">⚠️ Low Stock Alert</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {lowStock.length} items are below minimum stock level. Consider reordering.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStock.map((i) => (
                  <span key={i.id} className="badge-warning">{i.name}: {i.quantity} {i.unit}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((item) => {
          const isLow = item.quantity <= item.minStock;
          const isCritical = item.quantity <= item.minStock / 2;
          return (
            <Card key={item.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{item.category}</p>
                </div>
                {isCritical ? (
                  <span className="badge-danger">Critical</span>
                ) : isLow ? (
                  <span className="badge-warning">Low</span>
                ) : (
                  <span className="badge-success">OK</span>
                )}
              </div>

              <div className="mb-3">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-3xl font-bold">{item.quantity}</p>
                  <p className="text-xs text-slate-500">{item.unit}</p>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${
                    isCritical ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                  }`} style={{ width: `${Math.min(100, (item.quantity / (item.minStock * 3)) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Min: {item.minStock} {item.unit}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500">Value</p>
                  <p className="font-bold text-sm">{formatCurrency(item.quantity * item.costPerUnit, currency)}</p>
                </div>
                <button
                  onClick={() => {
                    const newQty = prompt(`Update quantity for ${item.name}:`, item.quantity.toString());
                    if (newQty !== null) {
                      const updated = { quantity: parseInt(newQty) || 0 };
                      // Update inventory
                      window.dispatchEvent(new CustomEvent("update-inventory", { detail: { id: item.id, patch: updated } }));
                    }
                  }}
                  className="btn-ghost text-xs"
                >
                  <Edit2 className="w-3 h-3" /> Update
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
