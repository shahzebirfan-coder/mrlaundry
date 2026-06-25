"use client";

import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, FileText, Database } from "lucide-react";
import {
  parseFile, mapCustomers, mapOrders, mapInventory, mapEmployees,
  downloadJSON, downloadCSV,
} from "@/lib/data-import";
import { usePOSStore } from "@/lib/store";
import type { Customer, Order, Employee, InventoryItem } from "@/lib/types";

type ImportType = "orders" | "customers" | "inventory" | "employees" | "full-backup";

interface ImportResult {
  type: ImportType;
  count: number;
  highestOrderId?: string;
}

export function DataImport() {
  const {
    orders, customers, employees, inventory,
    addOrder, addCustomer, addEmployee, updateInventory,
  } = usePOSStore();

  const [importType, setImportType] = useState<ImportType>("orders");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    try {
      const rows = await parseFile(file);
      if (!rows.length) throw new Error("File is empty or invalid format");

      // Show preview (first 5 rows)
      setPreviewData(rows.slice(0, 5));

      // Process based on import type
      setImporting(true);
      let count = 0;
      let highestOrderId: string | undefined;

      if (importType === "orders") {
        const mapped = mapOrders(rows);
        // Find highest order ID
        const maxNum = mapped
          .map((o) => parseInt(o.id.replace(/\D/g, ""), 10))
          .filter((n) => !isNaN(n))
          .reduce((max, n) => Math.max(max, n), 1000);
        highestOrderId = `ORD-${maxNum}`;

        mapped.forEach((order) => addOrder(order));
        count = mapped.length;
      } else if (importType === "customers") {
        const mapped = mapCustomers(rows);
        mapped.forEach((customer) => addCustomer(customer));
        count = mapped.length;
      } else if (importType === "inventory") {
        const mapped = mapInventory(rows);
        mapped.forEach((item) => {
          // Check if exists, update or add
          const existing = inventory.find((i) => i.id === item.id);
          if (existing) updateInventory(item.id, item);
          else {
            // Use the store directly to add new
            usePOSStore.setState((s) => ({ inventory: [...s.inventory, item] }));
          }
        });
        count = mapped.length;
      } else if (importType === "employees") {
        const mapped = mapEmployees(rows);
        mapped.forEach((employee) => addEmployee(employee));
        count = mapped.length;
      }

      setResult({ type: importType, count, highestOrderId });
      setPreviewData(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setError(err?.message || "Import failed. Please check file format.");
    } finally {
      setImporting(false);
    }
  }

  function exportBackup() {
    const backup = {
      version: "1.1.0",
      exportedAt: new Date().toISOString(),
      customers,
      orders,
      employees,
      inventory,
      branches: usePOSStore.getState().branches,
    };
    downloadJSON(backup, `mr-laundry-backup-${new Date().toISOString().split("T")[0]}.json`);
  }

  function exportCSV(type: "orders" | "customers" | "inventory" | "employees") {
    const data = type === "orders" ? orders
      : type === "customers" ? customers
      : type === "inventory" ? inventory
      : employees;
    downloadCSV(data, `mr-laundry-${type}-${new Date().toISOString().split("T")[0]}.csv`);
  }

  function downloadTemplate(type: "orders" | "customers" | "inventory" | "employees") {
    const link = document.createElement("a");
    link.href = `/samples/${type}-template.csv`;
    link.download = `${type}-template.csv`;
    link.click();
  }

  return (
    <div className="space-y-4">
      {/* Current Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Orders</p>
          <p className="text-xl font-bold text-primary-700 dark:text-primary-300">{orders.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Customers</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{customers.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Inventory</p>
          <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{inventory.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
          <p className="text-[10px] text-slate-500 uppercase">Employees</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{employees.length}</p>
        </div>
      </div>

      {/* Highest Order ID */}
      {orders.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-500">Next Invoice Number Will Be:</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            {(() => {
              const max = orders
                .map((o) => parseInt(o.id.replace(/\D/g, ""), 10))
                .filter((n) => !isNaN(n))
                .reduce((m, n) => Math.max(m, n), 1000);
              return `ORD-${max + 1}`;
            })()}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">(Continues from your last invoice)</p>
        </div>
      )}

      {/* Import Section */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Choose what to import:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {([
              { value: "orders", label: "📦 Orders", desc: "Invoice history" },
              { value: "customers", label: "👥 Customers", desc: "Client list" },
              { value: "inventory", label: "📋 Inventory", desc: "Stock items" },
              { value: "employees", label: "👨‍💼 Employees", desc: "Staff list" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setImportType(opt.value); setPreviewData(null); setResult(null); setError(null); }}
                className={`p-2.5 rounded-xl border-2 text-left transition-all text-xs ${
                  importType === opt.value
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-primary-300"
                }`}
              >
                <p className="font-bold">{opt.label}</p>
                <p className="text-[10px] text-slate-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">2. Upload file:</label>
          <div className="mt-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-semibold mt-2">
                {importing ? "Importing..." : "Click to upload file"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports: CSV, Excel (.xlsx), JSON</p>
              {importing && <Loader2 className="w-5 h-5 mx-auto mt-2 animate-spin text-primary-500" />}
            </label>
          </div>
        </div>

        {/* Preview */}
        {previewData && previewData.length > 0 && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">📋 Preview (first 5 rows):</p>
            <div className="overflow-x-auto">
              <table className="text-[10px] w-full">
                <thead>
                  <tr className="text-left">
                    {Object.keys(previewData[0]).slice(0, 6).map((k) => (
                      <th key={k} className="font-medium pr-2 pb-1">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t border-blue-200/50">
                      {Object.values(row).slice(0, 6).map((v: any, j) => (
                        <td key={j} className="pr-2 py-1">{String(v).slice(0, 20)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">✅ Click upload again or another file to import</p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  ✅ Successfully imported {result.count} {result.type}!
                </p>
                {result.highestOrderId && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    Highest order ID found: <strong>{result.highestOrderId}</strong>
                    <br />
                    New invoices will start from <strong>ORD-{parseInt(result.highestOrderId.replace(/\D/g, ""), 10) + 1}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">❌ Import Failed</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Download Templates */}
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">📥 Need a template?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {(["orders", "customers", "inventory", "employees"] as const).map((t) => (
              <button
                key={t}
                onClick={() => downloadTemplate(t)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> {t}-template.csv
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">📤 Export Current Data:</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={exportBackup} className="btn-secondary text-xs">
            <Database className="w-3 h-3" /> Full Backup (JSON)
          </button>
          <button onClick={() => exportCSV("orders")} className="btn-ghost text-xs">
            <FileText className="w-3 h-3" /> Orders CSV
          </button>
          <button onClick={() => exportCSV("customers")} className="btn-ghost text-xs">
            <FileText className="w-3 h-3" /> Customers CSV
          </button>
          <button onClick={() => exportCSV("inventory")} className="btn-ghost text-xs">
            <FileText className="w-3 h-3" /> Inventory CSV
          </button>
          <button onClick={() => exportCSV("employees")} className="btn-ghost text-xs">
            <FileText className="w-3 h-3" /> Employees CSV
          </button>
        </div>
      </div>
    </div>
  );
}
