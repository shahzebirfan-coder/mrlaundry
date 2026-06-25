// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
// Get credentials from: https://app.supabase.com/project/_/settings/api
// Add them to .env.local file:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
// ==========================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Convert camelCase JS object to snake_case DB column
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== "object") return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
}

// Convert snake_case DB row to camelCase JS object
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== "object") return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
}
