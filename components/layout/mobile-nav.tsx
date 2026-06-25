"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Users, Package, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/",          icon: Home,        label: "Home" },
  { href: "/orders",    icon: ShoppingBag, label: "Orders" },
  { href: "/customers", icon: Users,       label: "Customers" },
  { href: "/inventory", icon: Package,     label: "Stock" },
  { href: "/reports",   icon: BarChart3,   label: "Reports" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium",
                active ? "text-primary-600 dark:text-primary-400" : "text-slate-500"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
