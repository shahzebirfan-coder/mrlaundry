"use client";

import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Crown, Star, Award, Gift, QrCode, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const TIERS = [
  {
    id: "silver", label: "Silver", minSpent: 0,
    color: "from-slate-300 to-slate-500", icon: Award,
    benefits: ["5% discount", "Earn loyalty points", "Birthday gift"],
  },
  {
    id: "gold", label: "Gold", minSpent: 25000,
    color: "from-amber-400 to-amber-600", icon: Star,
    benefits: ["10% discount", "2x loyalty points", "Free ironing monthly", "Priority service"],
  },
  {
    id: "platinum", label: "Platinum", minSpent: 50000,
    color: "from-slate-400 to-slate-700", icon: Crown,
    benefits: ["15% discount", "3x loyalty points", "Free wash monthly", "Free pickup/delivery", "VIP support"],
  },
];

export default function MembershipPage() {
  const { customers, currency } = usePOSStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Crown className="w-7 h-7 text-amber-500" /> Membership Program
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage loyalty tiers, points, and benefits
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const count = customers.filter((c) => c.membershipTier === tier.id).length;
          return (
            <Card key={tier.id} hover className={`!p-0 overflow-hidden`}>
              <div className={`bg-gradient-to-br ${tier.color} p-6 text-white`}>
                <Icon className="w-10 h-10 mb-3" />
                <h3 className="text-2xl font-bold">{tier.label}</h3>
                <p className="text-sm opacity-90 mt-1">{count} members</p>
                <p className="text-xs opacity-75 mt-2">Min spend: {formatCurrency(tier.minSpent, currency)}</p>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-500 mb-2">BENEFITS</p>
                <ul className="space-y-1.5">
                  {tier.benefits.map((b) => (
                    <li key={b} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Loyalty System */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-amber-500" /> Loyalty Points System</CardTitle>
            <CardSubtitle>100 {currency} spent = 1 point • Redeem for free services</CardSubtitle>
          </div>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 border border-primary-200">
            <p className="text-xs font-semibold text-primary-700 dark:text-primary-300">EARNING RATE</p>
            <p className="text-2xl font-bold mt-1">1 pt / {currency}100</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Spend to earn automatically</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">FREE IRONING</p>
            <p className="text-2xl font-bold mt-1">50 pts</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Redeem for free ironing service</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/10 border border-violet-200">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">DISCOUNT VOUCHER</p>
            <p className="text-2xl font-bold mt-1">100 pts</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Get {currency}500 discount voucher</p>
          </div>
        </div>
      </Card>

      {/* Member Cards */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>🎫 Member Cards</CardTitle>
            <CardSubtitle>Digital membership cards with QR codes</CardSubtitle>
          </div>
          <button className="btn-secondary"><Download className="w-4 h-4" /> Download All</button>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.filter(c => c.membershipTier !== "none").slice(0, 6).map((c) => {
            const tier = TIERS.find(t => t.id === c.membershipTier)!;
            const Icon = tier.icon;
            return (
              <div key={c.id} className={`rounded-2xl bg-gradient-to-br ${tier.color} p-5 text-white shadow-xl relative overflow-hidden`}>
                <div className="absolute -right-8 -top-8 opacity-10">
                  <Icon className="w-32 h-32" />
                </div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs opacity-80">MEMBERSHIP CARD</p>
                      <p className="text-lg font-bold mt-0.5">{tier.label.toUpperCase()}</p>
                    </div>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="mb-3">
                    <p className="text-xs opacity-80">CARD HOLDER</p>
                    <p className="font-bold">{c.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="opacity-70">CARD NO.</p>
                      <p className="font-mono font-bold">{c.membershipCard}</p>
                    </div>
                    <div>
                      <p className="opacity-70">POINTS</p>
                      <p className="font-bold">{c.loyaltyPoints}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs bg-white/20 rounded-lg p-2">
                    <QrCode className="w-4 h-4" />
                    <span className="font-mono">Scan for member perks</span>
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
