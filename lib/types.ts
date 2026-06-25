// ==========================================
// TYPE DEFINITIONS - Laundry POS System
// ==========================================

export type OrderStatus =
  | "received"
  | "washing"
  | "drying"
  | "ironing"
  | "quality_check"
  | "ready"
  | "out_for_delivery"
  | "delivered";

export const ORDER_STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: "received",         label: "Received",         color: "bg-blue-500"    },
  { value: "washing",          label: "Washing",          color: "bg-cyan-500"    },
  { value: "drying",           label: "Drying",           color: "bg-indigo-500"  },
  { value: "ironing",          label: "Ironing",          color: "bg-violet-500"  },
  { value: "quality_check",    label: "Quality Check",    color: "bg-amber-500"   },
  { value: "ready",            label: "Ready",            color: "bg-emerald-500" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-orange-500"  },
  { value: "delivered",        label: "Delivered",        color: "bg-green-600"   },
];

export type ServiceType =
  | "dry_clean"
  | "wash_fold"
  | "wash_iron"
  | "iron_only"
  | "express"
  | "premium";

export const SERVICE_TYPES: { value: ServiceType; label: string; price: number; days: number }[] = [
  { value: "dry_clean",  label: "Dry Clean",       price: 250, days: 3 },
  { value: "wash_fold",  label: "Wash & Fold",     price: 120, days: 2 },
  { value: "wash_iron",  label: "Wash & Iron",     price: 150, days: 2 },
  { value: "iron_only",  label: "Iron Only",       price: 60,  days: 1 },
  { value: "express",    label: "Express Service", price: 350, days: 1 },
  { value: "premium",    label: "Premium Service", price: 500, days: 4 },
];

export type GarmentType =
  | "shirt"
  | "pant"
  | "suit"
  | "coat"
  | "curtain"
  | "blanket"
  | "carpet"
  | "sofa_cover"
  | "custom";

export const GARMENT_TYPES: { value: GarmentType; label: string; icon: string }[] = [
  { value: "shirt",      label: "Shirt",      icon: "👔" },
  { value: "pant",       label: "Pant",       icon: "👖" },
  { value: "suit",       label: "Suit",       icon: "🤵" },
  { value: "coat",       label: "Coat",       icon: "🧥" },
  { value: "curtain",    label: "Curtain",    icon: "🪟" },
  { value: "blanket",    label: "Blanket",    icon: "🛏️" },
  { value: "carpet",     label: "Carpet",     icon: "🟫" },
  { value: "sofa_cover", label: "Sofa Cover", icon: "🛋️" },
  { value: "custom",     label: "Custom Item", icon: "📦" },
];

export interface GarmentCondition {
  torn?: boolean;
  stained?: boolean;
  missing_button?: boolean;
  color_fade?: boolean;
  damage?: boolean;
}

export interface OrderItem {
  id: string;
  garmentType: GarmentType;
  customName?: string;
  serviceType: ServiceType;
  quantity: number;
  color?: string;
  brand?: string;
  notes?: string;
  condition?: GarmentCondition;
  photoUrl?: string;
  stainDetected?: StainType[];
}

export type StainType = "oil" | "ink" | "blood" | "food" | "mud" | "sweat" | "wine" | "chocolate";

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  address?: string;
  location?: { lat: number; lng: number };
  membershipCard?: string;
  membershipTier: "silver" | "gold" | "platinum" | "none";
  photoUrl?: string;
  birthday?: string; // ISO date
  totalSpent: number;
  loyaltyPoints: number;
  outstandingBalance: number;
  createdAt: string;
  notes?: string;
}

export interface Order {
  id: string;            // e.g. "ORD-1023"
  customerId: string;
  customerName: string;
  customerMobile: string;
  branchId: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: "cash" | "card" | "online" | "credit";
  isExpress: boolean;
  deliveryPreference: "hanger" | "fold";  // Hanger ya Fold mein delivery
  notes?: string;
  photos: string[];
  createdAt: string;
  expectedAt: string;
  deliveredAt?: string;
  driverId?: string;
  qrCode?: string;
}

export type EmployeeRole =
  | "admin" | "manager" | "cashier" | "washer" | "iron_man" | "delivery_rider";

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  role: EmployeeRole;
  branchId: string;
  salary: number;
  loginTime?: string;
  logoutTime?: string;
  ordersProcessed: number;
  productivityScore: number;
  photoUrl?: string;
  joinedAt: string;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "detergent" | "chemical" | "hanger" | "packing" | "tag" | "other";
  quantity: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  supplier?: string;
  branchId: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  mobile: string;
  manager?: string;
  active: boolean;
}

export interface Activity {
  id: string;
  type: "order_created" | "order_status" | "customer_added" | "payment" | "delivery" | "feedback";
  message: string;
  timestamp: string;
  userId?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount: number;     // percent
  validTill: string;
  usageCount: number;
  maxUsage: number;
  active: boolean;
}

export interface Feedback {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;       // 1-5
  serviceRating: number;
  deliveryRating: number;
  staffRating: number;
  comment?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  mobile: string;
  active: boolean;
  assignedOrders: string[];
}
