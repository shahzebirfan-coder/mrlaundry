"use client";

import { useState } from "react";
import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Plus, Search, Phone, MapPin, Crown, Calendar, Star, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate, generateCustomerId } from "@/lib/utils";

export default function CustomersPage() {
  const { customers, orders, currency, addCustomer, addActivity } = usePOSStore();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", whatsapp: "", address: "", birthday: "" });

  const filtered = customers.filter((c) => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search);
    const matchTier = tierFilter === "all" || c.membershipTier === tierFilter;
    return matchSearch && matchTier;
  });

  const selectedCustomer = customers.find((c) => c.id === selected);
  const customerOrders = selectedCustomer ? orders.filter((o) => o.customerId === selectedCustomer.id) : [];

  function saveCustomer() {
    if (!form.name || !form.mobile) return;
    const newCustomer = {
      id: generateCustomerId(customers.map((c) => c.id)),
      ...form,
      membershipTier: "none" as const,
      totalSpent: 0,
      loyaltyPoints: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    addCustomer(newCustomer);
    addActivity({
      id: `act-${Date.now()}`,
      type: "customer_added",
      message: `New customer ${form.name} added`,
      timestamp: new Date().toISOString(),
    });
    setAddOpen(false);
    setForm({ name: "", mobile: "", whatsapp: "", address: "", birthday: "" });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Customers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {customers.length} total • {filtered.length} shown
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search customers..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "platinum", "gold", "silver", "none"].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  tierFilter === tier
                    ? "bg-primary-500 text-white shadow-lg"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} hover className="!p-5" onClick={() => setSelected(c.id)}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-full grid place-items-center text-white font-bold text-lg ${
                c.membershipTier === "platinum" ? "bg-gradient-to-br from-slate-400 to-slate-700" :
                c.membershipTier === "gold" ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                c.membershipTier === "silver" ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                "bg-gradient-to-br from-primary-400 to-primary-600"
              }`}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold truncate">{c.name}</p>
                  {c.membershipTier !== "none" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.mobile}</p>
                {c.address && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {c.address.slice(0, 30)}...
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Orders</p>
                <p className="font-bold text-sm">{orders.filter(o => o.customerId === c.id).length}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Spent</p>
                <p className="font-bold text-sm">{formatCurrency(c.totalSpent, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Points</p>
                <p className="font-bold text-sm text-primary-600">{c.loyaltyPoints}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Customer Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Customer Profile" size="lg">
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full grid place-items-center text-white font-bold text-2xl ${
                selectedCustomer.membershipTier === "platinum" ? "bg-gradient-to-br from-slate-400 to-slate-700" :
                selectedCustomer.membershipTier === "gold" ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                selectedCustomer.membershipTier === "silver" ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                "bg-gradient-to-br from-primary-400 to-primary-600"
              }`}>
                {selectedCustomer.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCustomer.mobile}</p>
                {selectedCustomer.membershipTier !== "none" && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold">
                    <Crown className="w-3 h-3" /> {selectedCustomer.membershipTier.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <p className="text-xs text-slate-500">Orders</p>
                <p className="font-bold text-lg">{customerOrders.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-xs text-slate-500">Total Spent</p>
                <p className="font-bold text-lg">{formatCurrency(selectedCustomer.totalSpent, currency)}</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                <p className="text-xs text-slate-500">Loyalty Pts</p>
                <p className="font-bold text-lg text-primary-600">{selectedCustomer.loyaltyPoints}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <p className="text-xs text-slate-500">Balance</p>
                <p className="font-bold text-lg">{formatCurrency(selectedCustomer.outstandingBalance, currency)}</p>
              </div>
            </div>

            {selectedCustomer.address && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-semibold mb-1">📍 Address</p>
                <p className="text-sm">{selectedCustomer.address}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">📦 Order History ({customerOrders.length})</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No orders yet</p>
                ) : customerOrders.slice(0, 10).map((o) => (
                  <div key={o.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{o.id}</p>
                      <p className="text-xs text-slate-500">{formatDate(o.createdAt)} • {o.items.length} items</p>
                    </div>
                    <p className="font-bold text-sm">{formatCurrency(o.total, currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Customer Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Customer">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold">Name *</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold">Mobile *</label>
            <input className="input mt-1" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold">WhatsApp</label>
            <input className="input mt-1" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold">Address</label>
            <input className="input mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold">Birthday</label>
            <input type="date" className="input mt-1" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          </div>
          <button onClick={saveCustomer} className="btn-primary w-full"><Plus className="w-4 h-4" /> Add Customer</button>
        </div>
      </Modal>
    </div>
  );
}
