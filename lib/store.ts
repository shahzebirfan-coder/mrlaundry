"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Customer, Order, Employee, InventoryItem, Branch, Activity, Coupon, Feedback, Driver,
} from "./types";
import {
  MOCK_BRANCHES, MOCK_CUSTOMERS, MOCK_ORDERS, MOCK_EMPLOYEES, MOCK_INVENTORY,
  MOCK_ACTIVITIES, MOCK_COUPONS, MOCK_FEEDBACK, MOCK_DRIVERS,
} from "./mock-data";
import { syncService, type SyncStatus } from "./sync-service";
import { isSupabaseConfigured } from "./supabase";

interface POSState {
  // Data
  customers: Customer[];
  orders: Order[];
  employees: Employee[];
  inventory: InventoryItem[];
  branches: Branch[];
  activities: Activity[];
  coupons: Coupon[];
  feedback: Feedback[];
  drivers: Driver[];

  // Settings
  theme: "light" | "dark";
  activeBranchId: string;
  shopName: string;
  shopTagline: string;
  shopPhone: string;
  shopWhatsapp: string;
  shopAddress: string;
  currency: string;

  // Sync state
  cloudEnabled: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  syncError: string | null;

  // Stats
  getStats: () => {
    todayOrders: number;
    pendingOrders: number;
    readyForDelivery: number;
    deliveredToday: number;
    totalSalesToday: number;
    monthlyRevenue: number;
  };

  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  updateInventory: (id: string, patch: Partial<InventoryItem>) => void;
  addCoupon: (coupon: Coupon) => void;
  addFeedback: (feedback: Feedback) => void;
  addActivity: (activity: Activity) => void;

  setTheme: (t: "light" | "dark") => void;
  setActiveBranch: (id: string) => void;
  updateSettings: (patch: Partial<Pick<POSState, "shopName" | "shopTagline" | "shopPhone" | "shopWhatsapp" | "shopAddress" | "currency">>) => void;

  // Sync actions
  pullFromCloud: () => Promise<boolean>;
  pushToCloud: () => Promise<boolean>;
  setCloudEnabled: (enabled: boolean) => void;

  resetToDemoData: () => void;
  clearAllData: () => void;
}

const initialData = {
  customers: MOCK_CUSTOMERS,
  orders: MOCK_ORDERS,
  employees: MOCK_EMPLOYEES,
  inventory: MOCK_INVENTORY,
  branches: MOCK_BRANCHES,
  activities: MOCK_ACTIVITIES,
  coupons: MOCK_COUPONS,
  feedback: MOCK_FEEDBACK,
  drivers: MOCK_DRIVERS,
};

// Helper: mark a table as dirty for cloud sync
function markDirty(_table: string) {
  if (typeof window === "undefined") return;
  syncService.markDirty(_table);
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      ...initialData,
      theme: "light",
      activeBranchId: "br-1",
      shopName: "Mr Laundry",
      shopTagline: "Quality Dry Cleaner Service",
      shopPhone: "03343691210",
      shopWhatsapp: "03343691210",
      shopAddress: "Shop 04, Gulistan E Zafar, SMCHS, Branch B, Karachi, Pakistan",
      currency: "₨",
      cloudEnabled: false,
      syncStatus: "idle",
      lastSyncAt: null,
      syncError: null,

      getStats: () => {
        const { orders } = get();
        const today = new Date().toDateString();
        const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
        const pendingOrders = orders.filter((o) =>
          ["received", "washing", "drying", "ironing", "quality_check"].includes(o.status)
        ).length;
        const readyForDelivery = orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery").length;
        const deliveredToday = orders.filter(
          (o) => o.status === "delivered" && o.deliveredAt && new Date(o.deliveredAt).toDateString() === today
        ).length;
        const totalSalesToday = orders
          .filter((o) => new Date(o.createdAt).toDateString() === today)
          .reduce((sum, o) => sum + o.paid, 0);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const monthlyRevenue = orders
          .filter((o) => new Date(o.createdAt) >= monthAgo && o.status !== "received")
          .reduce((sum, o) => sum + o.paid, 0);
        return { todayOrders, pendingOrders, readyForDelivery, deliveredToday, totalSalesToday, monthlyRevenue };
      },

      // ==========================================
      // DATA ACTIONS (each marks table dirty for cloud sync)
      // ==========================================
      addOrder: (order) => {
        set((s) => ({ orders: [order, ...s.orders] }));
        markDirty("orders");
      },
      updateOrder: (id, patch) => {
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        }));
        markDirty("orders");
      },
      updateOrderStatus: (id, status) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? { ...o, status, deliveredAt: status === "delivered" ? new Date().toISOString() : o.deliveredAt }
              : o
          ),
        }));
        markDirty("orders");
        markDirty("activities");
        const order = get().orders.find((o) => o.id === id);
        if (order) {
          get().addActivity({
            id: `act-${Date.now()}`,
            type: "order_status",
            message: `Order ${order.id} status updated to ${status.replace(/_/g, " ")}`,
            timestamp: new Date().toISOString(),
          });
        }
      },
      addCustomer: (customer) => {
        set((s) => ({ customers: [customer, ...s.customers] }));
        markDirty("customers");
      },
      updateCustomer: (id, patch) => {
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
        markDirty("customers");
      },
      addEmployee: (employee) => {
        set((s) => ({ employees: [...s.employees, employee] }));
        markDirty("employees");
      },
      updateEmployee: (id, patch) => {
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        markDirty("employees");
      },
      updateInventory: (id, patch) => {
        set((s) => ({
          inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        }));
        markDirty("inventory");
      },
      addCoupon: (coupon) => {
        set((s) => ({ coupons: [coupon, ...s.coupons] }));
        markDirty("coupons");
      },
      addFeedback: (feedback) => {
        set((s) => ({ feedback: [feedback, ...s.feedback] }));
        markDirty("feedback");
      },
      addActivity: (activity) => {
        set((s) => ({ activities: [activity, ...s.activities].slice(0, 50) }));
        markDirty("activities");
      },

      setTheme: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", t === "dark");
        }
      },
      setActiveBranch: (id) => set({ activeBranchId: id }),
      updateSettings: (patch) => {
        set(patch);
        markDirty("settings");
      },

      // ==========================================
      // CLOUD SYNC
      // ==========================================
      pullFromCloud: async () => {
        if (!isSupabaseConfigured()) {
          set({ syncStatus: "offline", syncError: "Supabase not configured" });
          return false;
        }
        set({ syncStatus: "syncing", syncError: null });
        try {
          const data = await syncService.pullAll();
          if (data) {
            set({
              ...data,
              syncStatus: "success",
              lastSyncAt: new Date().toISOString(),
              syncError: null,
            });
            return true;
          }
          set({ syncStatus: "error", syncError: "No data returned" });
          return false;
        } catch (err: any) {
          set({ syncStatus: "error", syncError: err?.message || "Sync failed" });
          return false;
        }
      },

      pushToCloud: async () => {
        const s = get();
        set({ syncStatus: "syncing", syncError: null });
        try {
          const ok = await syncService.pushAll({
            customers: s.customers,
            orders: s.orders,
            employees: s.employees,
            inventory: s.inventory,
            branches: s.branches,
            activities: s.activities,
            coupons: s.coupons,
            feedback: s.feedback,
            drivers: s.drivers,
          });
          if (ok) {
            set({ syncStatus: "success", lastSyncAt: new Date().toISOString(), syncError: null });
          } else {
            set({ syncStatus: "error", syncError: "Push failed" });
          }
          return ok;
        } catch (err: any) {
          set({ syncStatus: "error", syncError: err?.message || "Push failed" });
          return false;
        }
      },

      setCloudEnabled: (enabled) => {
        set({ cloudEnabled: enabled });
        if (enabled && isSupabaseConfigured()) {
          // Auto-pull from cloud when enabled
          get().pullFromCloud();
        }
      },

      resetToDemoData: () => {
        set({ ...initialData, theme: get().theme, activeBranchId: get().activeBranchId });
        markDirty("customers");
        markDirty("orders");
        markDirty("employees");
        markDirty("inventory");
        markDirty("branches");
        markDirty("activities");
        markDirty("coupons");
        markDirty("feedback");
        markDirty("drivers");
      },
      clearAllData: () => {
        set({
          customers: [], orders: [], employees: [], inventory: [],
          branches: [{ id: "br-1", name: "Main Branch", address: "", mobile: "", active: true }],
          activities: [], coupons: [], feedback: [], drivers: [],
        });
        markDirty("customers");
        markDirty("orders");
        markDirty("employees");
        markDirty("inventory");
        markDirty("branches");
        markDirty("activities");
        markDirty("coupons");
        markDirty("feedback");
        markDirty("drivers");
      },
    }),
    {
      name: "laundry-pos-storage",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage))),
      partialize: (s) => ({
        // Persist all data + settings locally as backup
        customers: s.customers, orders: s.orders, employees: s.employees,
        inventory: s.inventory, branches: s.branches, activities: s.activities,
        coupons: s.coupons, feedback: s.feedback, drivers: s.drivers,
        theme: s.theme, activeBranchId: s.activeBranchId, shopName: s.shopName,
        shopTagline: s.shopTagline, shopPhone: s.shopPhone, shopWhatsapp: s.shopWhatsapp,
        shopAddress: s.shopAddress, currency: s.currency,
        cloudEnabled: s.cloudEnabled,
      }),
    }
  )
);

// ==========================================
// GLOBAL SYNC WIRING (runs once on app load)
// ==========================================
if (typeof window !== "undefined") {
  // Initialize theme
  const stored = JSON.parse(localStorage.getItem("laundry-pos-storage") || "{}");
  const theme = stored?.state?.theme || "light";
  document.documentElement.classList.toggle("dark", theme === "dark");

  // Subscribe to sync state changes
  syncService.subscribe((state) => {
    usePOSStore.setState({
      syncStatus: state.status,
      lastSyncAt: state.lastSync || usePOSStore.getState().lastSyncAt,
      syncError: state.error,
    });
  });

  // When sync service requests data push, get it from store
  window.addEventListener("sync-to-cloud", () => {
    if (isSupabaseConfigured()) {
      usePOSStore.getState().pushToCloud();
    }
  });

  // Auto-pull from cloud on app load if enabled
  setTimeout(() => {
    const state = usePOSStore.getState();
    if (state.cloudEnabled && isSupabaseConfigured() && navigator.onLine) {
      state.pullFromCloud();
    }
  }, 1500);

  // Auto-sync when internet comes back
  window.addEventListener("online", () => {
    const state = usePOSStore.getState();
    if (state.cloudEnabled && isSupabaseConfigured()) {
      // Wait a bit then sync
      setTimeout(() => state.pushToCloud(), 1000);
    }
  });

  // Pull from cloud every 5 minutes when enabled (background sync)
  setInterval(() => {
    const state = usePOSStore.getState();
    if (state.cloudEnabled && isSupabaseConfigured() && navigator.onLine) {
      state.pullFromCloud();
    }
  }, 5 * 60 * 1000);
}
