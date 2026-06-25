// ==========================================
// DATA IMPORT SERVICE
// ==========================================
// Supports CSV / Excel / JSON import from old POS systems
// ==========================================

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Customer, Order, Employee, InventoryItem } from "./types";

// ==========================================
// PARSE FILE (CSV / Excel / JSON)
// ==========================================
export async function parseFile(file: File): Promise<any[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return parseCSV(file);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(file);
  } else if (ext === "json") {
    return parseJSON(file);
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings, we'll parse manually
      complete: (result) => resolve(result.data),
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

async function parseJSON(file: File): Promise<any[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [data];
}

// ==========================================
// COLUMN MAPPING - flexible matching
// ==========================================
function pick(row: any, ...keys: string[]): any {
  for (const key of keys) {
    // Exact match
    if (row[key] !== undefined && row[key] !== "") return row[key];
    // Case-insensitive match
    const found = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
    );
    if (found && row[found] !== undefined && row[found] !== "") return row[found];
  }
  return undefined;
}

function num(val: any, def = 0): number {
  if (val === undefined || val === null || val === "") return def;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? def : n;
}

function int(val: any, def = 0): number {
  if (val === undefined || val === null || val === "") return def;
  const n = parseInt(String(val).replace(/[^\d-]/g, ""), 10);
  return isNaN(n) ? def : n;
}

// ==========================================
// MAP ROWS → CUSTOMERS
// ==========================================
export function mapCustomers(rows: any[]): Customer[] {
  return rows
    .filter((r) => pick(r, "name", "customer name", "full name", "customer"))
    .map((r, i) => ({
      id: pick(r, "id", "customer id", "cust_id") || `cust-imp-${Date.now()}-${i}`,
      name: pick(r, "name", "customer name", "full name") || "",
      mobile: pick(r, "mobile", "phone", "cell", "contact", "whatsapp") || "",
      whatsapp: pick(r, "whatsapp", "whatsapp number"),
      address: pick(r, "address", "addr", "location"),
      membershipCard: pick(r, "membership card", "card", "card number", "membership"),
      membershipTier:
        (pick(r, "tier", "membership tier", "level") || "none").toLowerCase(),
      totalSpent: num(pick(r, "total spent", "spent", "lifetime value")),
      loyaltyPoints: int(pick(r, "loyalty points", "points", "reward points")),
      outstandingBalance: num(pick(r, "balance", "outstanding", "due")),
      birthday: pick(r, "birthday", "dob", "date of birth"),
      createdAt: pick(r, "created at", "created", "join date") || new Date().toISOString(),
      notes: pick(r, "notes", "remarks"),
    }));
}

// ==========================================
// MAP ROWS → ORDERS (Most Important - keeps invoice numbers!)
// ==========================================
export function mapOrders(rows: any[]): Order[] {
  return rows
    .filter((r) => pick(r, "id", "order id", "invoice", "invoice number", "bill", "order #"))
    .map((r, i) => {
      const id = String(pick(r, "id", "order id", "invoice", "invoice number", "bill", "order #"));
      // Clean the ID - ensure ORD-XXXX format if just a number
      const cleanId = id.startsWith("ORD-") ? id : `ORD-${id.replace(/\D/g, "")}`;

      // Try to parse items
      let items: any[] = [];
      const itemsRaw = pick(r, "items", "order items", "products");
      if (typeof itemsRaw === "string" && itemsRaw) {
        try {
          items = JSON.parse(itemsRaw);
        } catch {
          items = [];
        }
      } else if (Array.isArray(itemsRaw)) {
        items = itemsRaw;
      }

      return {
        id: cleanId,
        customerId: pick(r, "customer id", "customerid", "cust_id") || "",
        customerName: pick(r, "customer", "customer name", "client") || "",
        customerMobile: pick(r, "mobile", "phone", "customer phone", "contact") || "",
        branchId: pick(r, "branch id", "branch") || "br-1",
        items,
        status: (pick(r, "status", "order status") || "received").toLowerCase().replace(/\s/g, "_"),
        subtotal: num(pick(r, "subtotal", "sub total")),
        discount: num(pick(r, "discount")),
        total: num(pick(r, "total", "amount", "grand total", "final")),
        paid: num(pick(r, "paid", "amount paid", "received")),
        balance: num(pick(r, "balance", "due")),
        paymentMethod: (pick(r, "payment", "payment method", "pay mode") || "cash").toLowerCase(),
        isExpress: pick(r, "express", "is express") === "true" || pick(r, "express") === "yes" || pick(r, "express") === "1",
        deliveryPreference: (pick(r, "delivery", "delivery preference", "hanger/fold", "packaging") || "fold").toLowerCase().includes("hang") ? "hanger" : "fold",
        notes: pick(r, "notes", "remarks"),
        photos: [],
        createdAt: pick(r, "created at", "date", "order date", "date created") || new Date().toISOString(),
        expectedAt: pick(r, "expected", "expected at", "delivery date", "ready by") || new Date().toISOString(),
        deliveredAt: pick(r, "delivered at", "delivered"),
      };
    });
}

// ==========================================
// MAP ROWS → INVENTORY
// ==========================================
export function mapInventory(rows: any[]): InventoryItem[] {
  return rows
    .filter((r) => pick(r, "name", "item", "product", "item name"))
    .map((r, i) => ({
      id: pick(r, "id", "sku", "code") || `inv-imp-${Date.now()}-${i}`,
      name: pick(r, "name", "item", "product", "item name") || "",
      category: (pick(r, "category", "type") || "other").toLowerCase(),
      quantity: num(pick(r, "quantity", "qty", "stock", "stock level")),
      unit: pick(r, "unit", "uom") || "pcs",
      minStock: num(pick(r, "min stock", "minimum", "reorder level", "low stock alert")),
      costPerUnit: num(pick(r, "cost", "price", "cost per unit")),
      supplier: pick(r, "supplier", "vendor"),
      branchId: pick(r, "branch id", "branch") || "br-1",
    }));
}

// ==========================================
// MAP ROWS → EMPLOYEES
// ==========================================
export function mapEmployees(rows: any[]): Employee[] {
  return rows
    .filter((r) => pick(r, "name", "employee", "staff"))
    .map((r, i) => ({
      id: pick(r, "id", "emp id", "employee id") || `emp-imp-${Date.now()}-${i}`,
      name: pick(r, "name", "employee", "staff") || "",
      mobile: pick(r, "mobile", "phone", "contact") || "",
      role: (pick(r, "role", "position", "job") || "cashier").toLowerCase().replace(/\s/g, "_"),
      branchId: pick(r, "branch id", "branch") || "br-1",
      salary: num(pick(r, "salary", "pay", "wage")),
      ordersProcessed: int(pick(r, "orders", "orders processed")),
      productivityScore: int(pick(r, "productivity", "score", "performance")),
      joinedAt: pick(r, "joined", "join date", "hired") || new Date().toISOString(),
      active: pick(r, "active", "status") !== "inactive" && pick(r, "active") !== "false",
    }));
}

// ==========================================
// EXPORT TO JSON (for backup)
// ==========================================
export function downloadJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================
// EXPORT TO CSV (for backup)
// ==========================================
export function downloadCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
