"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { MessageSquare, Phone, CheckCircle2, Settings as SettingsIcon } from "lucide-react";

const TEMPLATES = [
  { id: "t1", trigger: "Order Received", icon: "📦", message: "Dear {customer}, your order #{orderId} has been received at Mr Laundry. Expected ready: {date}. Thank you for choosing our Quality Dry Cleaner Service!" },
  { id: "t2", trigger: "Order Washing", icon: "💧", message: "Hi {customer}, your order #{orderId} is now being washed with premium care at Mr Laundry. We'll notify you when ready." },
  { id: "t3", trigger: "Ready for Pickup", icon: "✅", message: "Great news {customer}! Your order #{orderId} is ready for pickup at Mr Laundry. Total: {total}. Visit us anytime!" },
  { id: "t4", trigger: "Out for Delivery", icon: "🚚", message: "Your order #{orderId} from Mr Laundry is out for delivery! Driver {driver} will reach you shortly. Track: mrlaundry.pk/track/{orderId}" },
  { id: "t5", trigger: "Delivered", icon: "🎉", message: "Your order #{orderId} has been delivered. Thank you for choosing Mr Laundry! Please rate our service: mrlaundry.pk/feedback/{orderId}" },
  { id: "t6", trigger: "Feedback Request", icon: "⭐", message: "How was your experience with Mr Laundry? Please rate our Quality Dry Cleaner Service: mrlaundry.pk/feedback/{orderId}" },
  { id: "t7", trigger: "Birthday Wishes", icon: "🎂", message: "Happy Birthday {customer}! 🎉 Enjoy 20% OFF on your next order at Mr Laundry with code BDAY20. Valid this month only!" },
];

export default function WhatsAppPage() {
  const { customers, orders } = usePOSStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-500" /> WhatsApp Integration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automatic notifications & message templates
          </p>
        </div>
        <button className="btn-primary"><SettingsIcon className="w-4 h-4" /> Configure</button>
      </div>

      {/* Status */}
      <Card className="!p-4 border-l-4 border-emerald-500">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">✅ WhatsApp Business API Connected</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Send automatic notifications to {customers.filter(c => c.whatsapp).length} customers with WhatsApp numbers
            </p>
            <p className="text-xs text-slate-500 mt-2">
              💡 To connect your real WhatsApp Business API, integrate with Twilio, Meta WhatsApp Cloud API, or WATI in <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">/settings</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-slate-500">Messages Sent Today</p>
          <p className="text-3xl font-bold mt-1 text-emerald-600">142</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Delivery Rate</p>
          <p className="text-3xl font-bold mt-1">98.5%</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Active Templates</p>
          <p className="text-3xl font-bold mt-1">{TEMPLATES.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">WhatsApp Customers</p>
          <p className="text-3xl font-bold mt-1">{customers.filter(c => c.whatsapp).length}</p>
        </Card>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>📝 Message Templates</CardTitle>
            <CardSubtitle>Auto-triggered messages</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{t.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{t.trigger}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t.message}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.message.match(/\{[^}]+\}/g)?.map((v) => (
                      <span key={v} className="badge-info !text-[10px]">{v}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-600 font-medium">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>📨 Recent Messages</CardTitle>
            <CardSubtitle>Last 10 sent messages</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-2">
          {orders.slice(0, 6).map((o, i) => {
            const statuses = ["Order Received", "Out for Delivery", "Ready for Pickup", "Delivered"];
            const template = TEMPLATES[i % TEMPLATES.length];
            return (
              <div key={o.id} className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-900/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 grid place-items-center text-white flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{o.customerName}</p>
                      <span className="text-[10px] text-slate-500">{o.customerMobile}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      <strong>{template.trigger}:</strong> {template.message.replace("{customer}", o.customerName).replace("{orderId}", o.id).replace("{date}", new Date(o.expectedAt).toLocaleDateString())}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Delivered • 2 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
