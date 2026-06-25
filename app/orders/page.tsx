"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Plus, Search, Filter, Download, Eye } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Receipt } from "@/components/orders/receipt";
import { GarmentTag } from "@/components/orders/garment-tag";

export default function OrdersPage() {
  const { orders, currency, customers, shopName, shopTagline, shopPhone, shopWhatsapp, shopAddress } = usePOSStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<string | null>(null);
  const [taggingOrder, setTaggingOrder] = useState<string | null>(null);
  const [tagQuantity, setTagQuantity] = useState(1);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = !search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.customerMobile.includes(search);
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const selectedOrder = orders.find((o) => o.id === selected);
  const selectedCustomer = customers.find((c) => c.id === selectedOrder?.customerId);
  const printOrder = orders.find((o) => o.id === printingOrder);
  const tagOrder = orders.find((o) => o.id === taggingOrder);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {orders.length} total orders • {filtered.length} shown
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
          <Link href="/orders/new" className="btn-primary"><Plus className="w-4 h-4" /> New Order</Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search by order ID, customer name, or mobile..."
              className="input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === "all"
                  ? "bg-primary-500 text-white shadow-lg"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              All
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === s.value
                    ? `${s.color} text-white shadow-lg`
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((order) => {
          const status = ORDER_STATUSES.find((s) => s.value === order.status)!;
          return (
            <Card key={order.id} hover className="!p-5" >
              <div onClick={() => setSelected(order.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-lg">{order.id}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{relativeTime(order.createdAt)}</p>
                  </div>
                  <span className={`${status.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
                    {status.label}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.customerMobile}</p>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.quantity}× {item.garmentType.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-500">{item.serviceType.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-slate-500">+{order.items.length - 3} more items</p>
                  )}
                </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                <p className="font-bold">{formatCurrency(order.total, currency)}</p>
              </div>
              <div className="flex items-center gap-1">
                {order.deliveryPreference && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    order.deliveryPreference === "hanger"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}>
                    {order.deliveryPreference === "hanger" ? "🪝 HANGER" : "📦 FOLD"}
                  </span>
                )}
                {order.isExpress && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    ⚡ EXPRESS
                  </span>
                )}
              </div>
            </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="!p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">No orders found matching your filters.</p>
        </Card>
      )}

      {/* Order Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selectedOrder ? `Order ${selectedOrder.id}` : ""}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`${ORDER_STATUSES.find(s => s.value === selectedOrder.status)?.color} text-white text-xs font-semibold px-3 py-1.5 rounded-full`}>
                {ORDER_STATUSES.find(s => s.value === selectedOrder.status)?.label}
              </span>
              <p className="text-2xl font-bold">{formatCurrency(selectedOrder.total, currency)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Customer</p>
                <p className="font-semibold">{selectedOrder.customerName}</p>
                <p className="text-xs text-slate-500">{selectedOrder.customerMobile}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Created</p>
                <p className="font-semibold">{relativeTime(selectedOrder.createdAt)}</p>
                <p className="text-xs text-slate-500">Expected: {new Date(selectedOrder.expectedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {selectedCustomer && (
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400">Loyalty Points</p>
                <p className="font-bold text-primary-700 dark:text-primary-300">{selectedCustomer.loyaltyPoints} pts</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Items</p>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.quantity}× {item.garmentType.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">{item.serviceType.replace(/_/g, " ")} {item.color && `• ${item.color}`}</p>
                    </div>
                    <p className="font-bold text-sm">{formatCurrency(item.quantity * 100, currency)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <p className="text-xs text-slate-500">Subtotal</p>
                <p className="font-semibold">{formatCurrency(selectedOrder.subtotal, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Discount</p>
                <p className="font-semibold text-emerald-600">-{formatCurrency(selectedOrder.discount, currency)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Paid</p>
                <p className="font-semibold text-primary-600">{formatCurrency(selectedOrder.paid, currency)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <Link href={`/tracking/${selectedOrder.id}`} className="btn-secondary flex-1">
                <Eye className="w-4 h-4" /> Track Order
              </Link>
              <button onClick={() => setPrintingOrder(selectedOrder.id)} className="btn-primary flex-1">
                <Download className="w-4 h-4" /> Print Receipt
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setTaggingOrder(selectedOrder.id); setTagQuantity(selectedOrder.items.reduce((s, i) => s + i.quantity, 0)); }}
                className="btn-secondary w-full !bg-cyan-50 !border-cyan-300 !text-cyan-700 hover:!bg-cyan-100"
              >
                🏷️ Print Garment Tag ({selectedOrder.items.reduce((s, i) => s + i.quantity, 0)} tags)
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print Receipt Modal */}
      {printOrder && (
        <Modal open={!!printingOrder} onClose={() => setPrintingOrder(null)} title="" size="md">
          <Receipt
            order={printOrder}
            shopName={shopName}
            shopTagline={shopTagline}
            shopPhone={shopPhone}
            shopWhatsapp={shopWhatsapp}
            shopAddress={shopAddress}
            currency={currency}
            onClose={() => setPrintingOrder(null)}
            autoPrint={false}
          />
        </Modal>
      )}

      {/* Print Garment Tag Modal */}
      {tagOrder && (
        <Modal open={!!taggingOrder} onClose={() => setTaggingOrder(null)} title="" size="md">
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
                🏷️ Print Garment Tags
              </p>
              <p className="text-xs text-cyan-700 dark:text-cyan-400 mb-3">
                Each tag attaches to a garment for tracking. Total items in this order: <strong>{tagOrder.items.reduce((s, i) => s + i.quantity, 0)}</strong>
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold">How many tags?</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tagQuantity}
                  onChange={(e) => setTagQuantity(parseInt(e.target.value) || 1)}
                  className="input !w-20 !py-1"
                />
                <button
                  onClick={() => setTagQuantity(tagOrder.items.reduce((s, i) => s + i.quantity, 0))}
                  className="text-xs text-primary-600 hover:underline"
                >
                  (All items)
                </button>
              </div>
            </div>
            <GarmentTag
              order={tagOrder}
              shopName={shopName}
              shopTagline={shopTagline}
              shopPhone={shopPhone}
              shopWhatsapp={shopWhatsapp}
              shopAddress={shopAddress}
              quantity={tagQuantity}
              onClose={() => setTaggingOrder(null)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
