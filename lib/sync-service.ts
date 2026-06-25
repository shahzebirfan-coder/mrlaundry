// ==========================================
// SYNC SERVICE - Auto-sync between LocalStorage & Supabase
// ==========================================
// Strategy:
//   1. On startup: Fetch from cloud (if online) → merge with local
//   2. On change: Save to localStorage immediately (instant UI)
//   3. Background: Sync to cloud (debounced, async)
//   4. On reconnect: Auto-sync pending changes
//   5. Conflict resolution: Cloud wins (last-write-wins)
// ==========================================

import { getSupabase, isSupabaseConfigured, toSnakeCase, toCamelCase } from "./supabase";
import type {
  Customer, Order, Employee, InventoryItem, Branch, Activity, Coupon, Feedback, Driver,
} from "./types";

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

interface SyncState {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  pendingChanges: number;
}

type Listener = (state: SyncState) => void;

class SyncService {
  private state: SyncState = {
    status: "idle",
    lastSync: null,
    error: null,
    pendingChanges: 0,
  };
  private listeners: Set<Listener> = new Set();
  private syncQueue: Set<string> = new Set(); // table names with pending changes
  private debounceTimer: any = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  getState(): SyncState {
    return this.state;
  }

  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  // ==========================================
  // FETCH ALL DATA FROM CLOUD
  // ==========================================
  async pullAll(): Promise<{
    customers: Customer[];
    orders: Order[];
    employees: Employee[];
    inventory: InventoryItem[];
    branches: Branch[];
    activities: Activity[];
    coupons: Coupon[];
    feedback: Feedback[];
    drivers: Driver[];
  } | null> {
    const sb = getSupabase();
    if (!sb) return null;

    try {
      this.setState({ status: "syncing", error: null });

      const [customers, orders, employees, inventory, branches, activities, coupons, feedback, drivers] =
        await Promise.all([
          sb.from("customers").select("*"),
          sb.from("orders").select("*").order("created_at", { ascending: false }),
          sb.from("employees").select("*"),
          sb.from("inventory").select("*"),
          sb.from("branches").select("*"),
          sb.from("activities").select("*").order("timestamp", { ascending: false }).limit(50),
          sb.from("coupons").select("*"),
          sb.from("feedback").select("*").order("created_at", { ascending: false }),
          sb.from("drivers").select("*"),
        ]);

      const result = {
        customers: (customers.data || []).map(toCamelCase),
        orders: (orders.data || []).map(toCamelCase),
        employees: (employees.data || []).map(toCamelCase),
        inventory: (inventory.data || []).map(toCamelCase),
        branches: (branches.data || []).map(toCamelCase),
        activities: (activities.data || []).map(toCamelCase),
        coupons: (coupons.data || []).map(toCamelCase),
        feedback: (feedback.data || []).map(toCamelCase),
        drivers: (drivers.data || []).map(toCamelCase),
      };

      this.setState({ status: "success", lastSync: new Date().toISOString(), error: null });
      return result;
    } catch (err: any) {
      this.setState({ status: "error", error: err?.message || "Sync failed" });
      return null;
    }
  }

  // ==========================================
  // PUSH LOCAL DATA TO CLOUD
  // ==========================================
  async pushTable(table: string, rows: any[]): Promise<boolean> {
    const sb = getSupabase();
    if (!sb || rows.length === 0) return true;

    try {
      const snakeRows = rows.map(toSnakeCase);
      // Upsert (insert or update) all rows
      const { error } = await sb.from(table).upsert(snakeRows, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error(`Sync error for ${table}:`, err);
      this.setState({ status: "error", error: `${table}: ${err?.message || "Failed"}` });
      return false;
    }
  }

  async pushAll(data: {
    customers: Customer[]; orders: Order[]; employees: Employee[];
    inventory: InventoryItem[]; branches: Branch[]; activities: Activity[];
    coupons: Coupon[]; feedback: Feedback[]; drivers: Driver[];
  }): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;

    this.setState({ status: "syncing", error: null });
    try {
      await Promise.all([
        this.pushTable("customers", data.customers),
        this.pushTable("orders", data.orders),
        this.pushTable("employees", data.employees),
        this.pushTable("inventory", data.inventory),
        this.pushTable("branches", data.branches),
        this.pushTable("activities", data.activities),
        this.pushTable("coupons", data.coupons),
        this.pushTable("feedback", data.feedback),
        this.pushTable("drivers", data.drivers),
      ]);
      this.setState({ status: "success", lastSync: new Date().toISOString(), error: null, pendingChanges: 0 });
      return true;
    } catch (err: any) {
      this.setState({ status: "error", error: err?.message || "Sync failed" });
      return false;
    }
  }

  // ==========================================
  // DELETE FROM CLOUD
  // ==========================================
  async deleteFromCloud(table: string, id: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error(`Delete error for ${table}:`, err);
      return false;
    }
  }

  // ==========================================
  // DEBOUNCED SYNC (called after each change)
  // ==========================================
  markDirty(table: string) {
    this.syncQueue.add(table);
    this.setState({ pendingChanges: this.syncQueue.size });

    // Debounce: wait 2 seconds before syncing
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncDirtyTables();
    }, 2000);
  }

  async syncDirtyTables() {
    if (this.syncQueue.size === 0) return;
    if (!isSupabaseConfigured()) {
      this.setState({ status: "offline", error: "Cloud not configured - using local only" });
      return;
    }
    if (!navigator.onLine) {
      this.setState({ status: "offline", error: "No internet - changes saved locally" });
      return;
    }

    const tables = Array.from(this.syncQueue);
    this.syncQueue.clear();

    // Trigger sync through window event so the store can pass its data
    window.dispatchEvent(new CustomEvent("sync-to-cloud", { detail: { tables } }));
  }

  // ==========================================
  // TEST CONNECTION
  // ==========================================
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: "Supabase not configured. Add credentials to .env.local" };

    try {
      const { data, error } = await sb.from("customers").select("id").limit(1);
      if (error) throw error;
      return { ok: true, message: `Connected! Found ${data?.length ?? 0} customers.` };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Connection failed" };
    }
  }
}

export const syncService = new SyncService();
