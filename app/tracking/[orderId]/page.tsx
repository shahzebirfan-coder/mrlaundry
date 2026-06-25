"use client";

import { useEffect, useState } from "react";
import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Truck, Package, Download, MapPin, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ORDER_STATUSES } from "@/lib/types";
import { formatCurrency, relativeTime } from "@/lib/utils";

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const { orders, currency, shopName, shopPhone, updateOrderStatus } = usePOSStore();
  const order = orders.find((o) => o.id === params.orderId);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && order) {
      import("qrcode").then((QRCode) => {
        QRCode.toDataURL(`https://sparklewash.pk/track/${order.id}`, { width: 200, margin: 1 })
          .then(setQrUrl)
          .catch(() => {});
      });
    }
  }, [order]);

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl">🔍</p>
        <p className="text-lg font-bold mt-2">Order not found</p>
        <Link href="/orders" className="btn-primary mt-4 inline-flex">← Back to Orders</Link>
      </div>
    );
  }

  const currentStatusIndex = ORDER_STATUSES.findIndex((s) => s.value === order.status);

  function advanceStatus() {
    if (currentStatusIndex < ORDER_STATUSES.length - 1) {
      updateOrderStatus(order!.id, ORDER_STATUSES[currentStatusIndex + 1].value);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Link href="/orders" className="btn-ghost inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </Link>

      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">ORDER ID</p>
            <h1 className="text-3xl font-bold">{order.id}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {order.customerName} • {order.customerMobile}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Amount</p>
            <p className="text-3xl font-bold text-primary-600">{formatCurrency(order.total, currency)}</p>
            <p className="text-xs text-slate-500 mt-1">Created {relativeTime(order.createdAt)}</p>
          </div>
        </div>
      </Card>

      {/* Live Status Timeline */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">📍 Live Order Tracking</CardTitle>
            <CardSubtitle>Real-time status updates</CardSubtitle>
          </div>
          {currentStatusIndex < ORDER_STATUSES.length - 1 && (
            <button onClick={advanceStatus} className="btn-primary text-sm">
              Advance Status →
            </button>
          )}
        </CardHeader>

        <div className="space-y-3">
          {ORDER_STATUSES.map((s, i) => {
            const isComplete = i <= currentStatusIndex;
            const isCurrent = i === currentStatusIndex;
            return (
              <div key={s.value} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full grid place-items-center font-bold text-sm transition-all ${
                    isCurrent ? `${s.color} text-white ring-4 ring-primary-200 dark:ring-primary-900 animate-pulse` :
                    isComplete ? `${s.color} text-white` :
                    "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  {i < ORDER_STATUSES.length - 1 && (
                    <div className={`w-0.5 h-12 ${i < currentStatusIndex ? "bg-primary-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className={`font-semibold ${isCurrent ? "text-primary-600" : isComplete ? "" : "text-slate-400"}`}>
                    {s.label} {isCurrent && <span className="ml-2 badge-info animate-pulse">In Progress</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isCurrent ? "Currently being processed" :
                     isComplete ? "Completed" :
                     "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* QR Code + Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>📱 Order QR Code</CardTitle>
              <CardSubtitle>Scan to track on mobile</CardSubtitle>
            </div>
          </CardHeader>
          <div className="text-center">
            {qrUrl ? (
              <img src={qrUrl} alt="Order QR Code" className="mx-auto rounded-xl border-4 border-white shadow-lg" />
            ) : (
              <div className="w-48 h-48 mx-auto skeleton rounded-xl" />
            )}
            <p className="text-xs font-mono mt-3 text-slate-500">{order.id}</p>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-secondary flex-1 text-xs"><Download className="w-3 h-3" /> Save QR</button>
            <button className="btn-secondary flex-1 text-xs"><Download className="w-3 h-3" /> Barcode</button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Delivery Tracking</CardTitle>
              <CardSubtitle>Live map (mock)</CardSubtitle>
            </div>
          </CardHeader>
          <div className="aspect-video rounded-xl bg-gradient-to-br from-primary-100 to-emerald-100 dark:from-primary-900/30 dark:to-emerald-900/30 grid place-items-center relative overflow-hidden">
            {/* Mock map */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            <div className="relative text-center">
              <div className="text-4xl animate-bounce">🚚</div>
              <p className="text-sm font-bold mt-2">{order.driverId ? "Driver Assigned" : "Awaiting Driver"}</p>
              <p className="text-xs text-slate-500">ETA: {new Date(order.expectedAt).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
              <p className="text-[10px] text-slate-500">Pickup</p>
              <p className="text-xs font-bold">Shop</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
              <p className="text-[10px] text-slate-500">Drop-off</p>
              <p className="text-xs font-bold">Customer</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Items Summary */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>📦 Items in this Order</CardTitle>
            <CardSubtitle>{order.items.length} item(s)</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{item.quantity}× {item.garmentType.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-500">{item.serviceType.replace(/_/g, " ")} {item.color && `• ${item.color}`}</p>
              </div>
              <span className="badge-info">{item.garmentType.replace(/_/g, " ").toUpperCase()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* WhatsApp Notification */}
      <Card className="!p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6" />
          <div className="flex-1">
            <p className="font-semibold">Send WhatsApp Update</p>
            <p className="text-sm opacity-90">Notify {order.customerName} about the current status</p>
          </div>
          <button className="px-4 py-2 bg-white text-emerald-700 rounded-xl font-semibold text-sm hover:bg-emerald-50">
            Send
          </button>
        </div>
      </Card>

      {/* CelineSoft Footer */}
      <div className="text-center py-4 mt-6 border-t border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-slate-400">
          Software Designed by <span className="font-bold text-slate-600 dark:text-slate-300">CelineSoft</span>
        </p>
      </div>
    </div>
  );
}
