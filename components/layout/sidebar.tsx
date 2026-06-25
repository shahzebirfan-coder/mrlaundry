"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Users, Package, UserCog,
  BarChart3, Megaphone, Star, CreditCard, Building2,
  MessageSquare, Settings as SettingsIcon, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePOSStore } from "@/lib/store";
import Image from "next/image";

const NAV = [
  { href: "/",            label: "Dashboard",    icon: LayoutDashboard },
  { href: "/orders",      label: "Orders",       icon: ShoppingBag },
  { href: "/customers",   label: "Customers",    icon: Users },
  { href: "/membership",  label: "Membership",   icon: Crown },
  { href: "/inventory",   label: "Inventory",    icon: Package },
  { href: "/employees",   label: "Employees",    icon: UserCog },
  { href: "/accounting",  label: "Accounting",   icon: CreditCard },
  { href: "/branches",    label: "Branches",     icon: Building2 },
  { href: "/marketing",   label: "Marketing",    icon: Megaphone },
  { href: "/feedback",    label: "Feedback",     icon: Star },
  { href: "/reports",     label: "Reports",      icon: BarChart3 },
  { href: "/whatsapp",    label: "WhatsApp",     icon: MessageSquare },
  { href: "/settings",    label: "Settings",     icon: SettingsIcon },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const shopName = usePOSStore((s) => s.shopName);
  const shopTagline = usePOSStore((s) => s.shopTagline);

  return (
    <aside className="h-full flex flex-col bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white shadow-lg ring-2 ring-primary-200 dark:ring-primary-800 flex-shrink-0">
            <Image
              src="/mr-laundry-logo.jpeg"
              alt="Mr Laundry"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">{shopName}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{shopTagline}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="rounded-xl p-3 bg-gradient-to-br from-primary-500/10 to-emerald-500/10 border border-primary-200 dark:border-primary-900">
          <p className="text-xs font-semibold text-primary-700 dark:text-primary-300">
            ✨ Offline Ready
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Data saved locally in browser
          </p>
        </div>
      </div>
    </aside>
  );
}
