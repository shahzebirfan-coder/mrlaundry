"use client";

import { Menu, Sun, Moon, Bell, Search, Wifi, WifiOff, Cloud, CloudOff, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { usePOSStore } from "@/lib/store";
import { useEffect, useState } from "react";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, setTheme, shopName, branches, activeBranchId, setActiveBranch, orders, cloudEnabled, syncStatus, syncError } =
    usePOSStore();

  const [online, setOnline] = useState(true);
  const [branchOpen, setBranchOpen] = useState(false);
  const activeBranch = branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine);
      const onOnline = () => setOnline(true);
      const onOffline = () => setOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }
  }, []);

  const pendingCount = orders.filter(
    (o) => !["delivered", "ready"].includes(o.status)
  ).length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 flex items-center gap-4">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search orders, customers, items..."
            className="input pl-10"
          />
        </div>
      </div>

      <div className="flex-1 md:flex-none" />

      {/* Cloud Sync Status (only if cloud enabled) */}
      {cloudEnabled && (
        <div
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            syncStatus === "success"
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
              : syncStatus === "syncing"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              : syncStatus === "error"
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300"
          }`}
          title={syncError || "Cloud sync status"}
        >
          {syncStatus === "syncing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
           syncStatus === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
           syncStatus === "error" ? <AlertCircle className="w-3.5 h-3.5" /> :
           <Cloud className="w-3.5 h-3.5" />}
          <span className="capitalize">{syncStatus === "syncing" ? "Syncing..." : syncStatus === "success" ? "Synced" : syncStatus}</span>
        </div>
      )}

      {/* Online/Offline */}
      <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
        online
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      }`}>
        {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        <span>{online ? "Online" : "Offline"}</span>
      </div>

      {/* Branch Selector */}
      <div className="relative hidden lg:block">
        <button
          onClick={() => setBranchOpen(!branchOpen)}
          className="btn-secondary text-sm"
        >
          🏪 {activeBranch?.name?.split(" - ")[0] || "Branch"}
        </button>
        {branchOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl glass-card !p-2 z-50 shadow-glass-lg">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => { setActiveBranch(b.id); setBranchOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  b.id === activeBranchId ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : ""
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
        <Bell className="w-5 h-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full grid place-items-center">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </header>
  );
}
