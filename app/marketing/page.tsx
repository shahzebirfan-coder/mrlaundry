"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Megaphone, MessageSquare, Tag, Send, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function MarketingPage() {
  const { coupons, customers } = usePOSStore();
  const [copied, setCopied] = useState<string | null>(null);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-rose-500" /> Marketing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          SMS, WhatsApp campaigns, and coupon codes
        </p>
      </div>

      {/* Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover className="!p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <MessageSquare className="w-8 h-8 mb-3" />
          <h3 className="text-xl font-bold">WhatsApp</h3>
          <p className="text-sm opacity-90 mt-1">Send broadcasts to {customers.length} customers</p>
          <button className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/30">
            <Send className="w-4 h-4" /> New Campaign
          </button>
        </Card>
        <Card hover className="!p-5 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
          <Megaphone className="w-8 h-8 mb-3" />
          <h3 className="text-xl font-bold">SMS</h3>
          <p className="text-sm opacity-90 mt-1">Send text messages instantly</p>
          <button className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/30">
            <Send className="w-4 h-4" /> Send SMS
          </button>
        </Card>
        <Card hover className="!p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
          <Tag className="w-8 h-8 mb-3" />
          <h3 className="text-xl font-bold">Coupons</h3>
          <p className="text-sm opacity-90 mt-1">{coupons.length} active coupon codes</p>
          <button className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/30">
            <Tag className="w-4 h-4" /> Create Coupon
          </button>
        </Card>
      </div>

      {/* Coupon Codes */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>🎟️ Active Coupon Codes</CardTitle>
            <CardSubtitle>Click to copy code</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-dashed border-amber-300 dark:border-amber-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">DISCOUNT CODE</p>
                  <p className="text-2xl font-bold font-mono mt-1 text-amber-900 dark:text-amber-100">{c.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-600">{c.discount}%</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">OFF</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-3">
                <span>Used: {c.usageCount} / {c.maxUsage}</span>
                <span>Valid till: {new Date(c.validTill).toLocaleDateString()}</span>
              </div>
              <div className="h-2 bg-amber-100 dark:bg-amber-900/50 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(c.usageCount / c.maxUsage) * 100}%` }} />
              </div>
              <button onClick={() => copyCode(c.code)} className="w-full btn-secondary !py-2 text-xs">
                {copied === c.code ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Code</>}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Campaign Composer */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>✉️ Campaign Composer</CardTitle>
            <CardSubtitle>Send bulk message to all customers</CardSubtitle>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold">Channel</label>
            <div className="flex gap-2 mt-1">
              <button className="btn-secondary flex-1 !bg-emerald-50 !text-emerald-700 !border-emerald-200">📱 WhatsApp</button>
              <button className="btn-secondary flex-1">💬 SMS</button>
              <button className="btn-secondary flex-1">📧 Email</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold">Subject</label>
            <input className="input mt-1" placeholder="EID Special Offer!" />
          </div>
          <div>
            <label className="text-xs font-semibold">Message</label>
            <textarea
              className="input mt-1"
              rows={4}
              placeholder="Get 30% OFF on all services this Eid. Use code EID30. Limited time offer!"
              defaultValue="🎉 EID SPECIAL! Get 30% OFF on all laundry services. Use code EID30. Book now!"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Will be sent to all {customers.length} customers</p>
            <button className="btn-primary"><Send className="w-4 h-4" /> Send Campaign</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
