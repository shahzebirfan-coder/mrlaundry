import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "₨") {
  return `${currency} ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export function generateOrderId(existing: string[]): string {
  const nums = existing
    .map((id) => {
      // Match ORD-XXXX or any numeric
      const match = id.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `ORD-${max + 1}`;
}

export function generateCustomerId(existing: string[]): string {
  const nums = existing
    .map((id) => parseInt(id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `cust-${max + 1}`;
}

export function generateEmployeeId(existing: string[]): string {
  const nums = existing
    .map((id) => parseInt(id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `emp-${max + 1}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PK", {
    hour: "2-digit", minute: "2-digit",
  });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
