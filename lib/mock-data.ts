import type {
  Customer, Order, Employee, InventoryItem, Branch, Activity, Coupon, Feedback, Driver,
} from "./types";

const now = new Date();
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const daysFromNow = (n: number) =>
  new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_BRANCHES: Branch[] = [
  { id: "br-1", name: "Main Branch - Gulshan",  address: "Block 6, Gulshan-e-Iqbal, Karachi", mobile: "0300-1234567", manager: "Ahmed Khan",   active: true },
  { id: "br-2", name: "Branch - Clifton",      address: "Sea View, Clifton, Karachi",          mobile: "0300-2345678", manager: "Sara Malik",   active: true },
  { id: "br-3", name: "Branch - DHA",          address: "Phase 6, DHA, Karachi",              mobile: "0300-3456789", manager: "Ali Raza",     active: true },
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "cust-1", name: "Bilal Ahmed", mobile: "0321-1234567", whatsapp: "0321-1234567",
    address: "House 123, Street 4, Gulshan", membershipCard: "VIP-0001", membershipTier: "platinum",
    totalSpent: 45600, loyaltyPoints: 456, outstandingBalance: 0, createdAt: daysAgo(180),
    birthday: "1990-05-15", notes: "Prefers express service",
  },
  {
    id: "cust-2", name: "Fatima Khan", mobile: "0333-9876543", whatsapp: "0333-9876543",
    address: "Flat 502, Clifton Towers", membershipCard: "GLD-0042", membershipTier: "gold",
    totalSpent: 28400, loyaltyPoints: 284, outstandingBalance: 1200, createdAt: daysAgo(120),
    birthday: "1988-08-22",
  },
  {
    id: "cust-3", name: "Hamza Sheikh", mobile: "0301-5555555", address: "House 88, DHA Phase 6",
    membershipCard: "SLV-0123", membershipTier: "silver",
    totalSpent: 12300, loyaltyPoints: 123, outstandingBalance: 0, createdAt: daysAgo(60),
  },
  {
    id: "cust-4", name: "Ayesha Siddiqui", mobile: "0345-7777777", whatsapp: "0345-7777777",
    address: "Apartment 304, Block B, North Nazimabad", membershipTier: "gold",
    totalSpent: 38900, loyaltyPoints: 389, outstandingBalance: 0, createdAt: daysAgo(90),
    birthday: "1992-12-03",
  },
  {
    id: "cust-5", name: "Usman Tariq", mobile: "0302-8888888", address: "House 22, Bahria Town",
    membershipTier: "none", totalSpent: 5400, loyaltyPoints: 54, outstandingBalance: 0, createdAt: daysAgo(30),
  },
  {
    id: "cust-6", name: "Mariam Iqbal", mobile: "0312-6666666", whatsapp: "0312-6666666",
    address: "Flat 12, Garden East", membershipCard: "VIP-0019", membershipTier: "platinum",
    totalSpent: 62100, loyaltyPoints: 621, outstandingBalance: 0, createdAt: daysAgo(240),
    birthday: "1985-11-18",
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-1023", customerId: "cust-1", customerName: "Bilal Ahmed", customerMobile: "0321-1234567",
    branchId: "br-1",
    items: [
      { id: "i-1", garmentType: "shirt", serviceType: "wash_iron", quantity: 5, color: "White", brand: "Gul Ahmed" },
      { id: "i-2", garmentType: "pant",  serviceType: "wash_iron", quantity: 3, color: "Navy",  brand: "J." },
    ],
    status: "washing", subtotal: 1200, discount: 120, total: 1080, paid: 1080, balance: 0,
    paymentMethod: "cash", isExpress: false, deliveryPreference: "hanger",
    createdAt: daysAgo(1), expectedAt: daysFromNow(1), photos: [],
  },
  {
    id: "ORD-1024", customerId: "cust-2", customerName: "Fatima Khan", customerMobile: "0333-9876543",
    branchId: "br-1",
    items: [
      { id: "i-3", garmentType: "suit",  serviceType: "dry_clean", quantity: 2, color: "Black" },
      { id: "i-4", garmentType: "coat",  serviceType: "dry_clean", quantity: 1, color: "Brown" },
    ],
    status: "ready", subtotal: 1000, discount: 0, total: 1000, paid: 800, balance: 200,
    paymentMethod: "credit", isExpress: false, deliveryPreference: "fold",
    createdAt: daysAgo(2), expectedAt: daysAgo(0), photos: [],
  },
  {
    id: "ORD-1025", customerId: "cust-3", customerName: "Hamza Sheikh", customerMobile: "0301-5555555",
    branchId: "br-2",
    items: [
      { id: "i-5", garmentType: "curtain", serviceType: "wash_fold", quantity: 4, color: "Beige" },
    ],
    status: "delivered", subtotal: 480, discount: 0, total: 480, paid: 480, balance: 0,
    paymentMethod: "card", isExpress: false, deliveryPreference: "fold",
    createdAt: daysAgo(3), expectedAt: daysAgo(1), deliveredAt: daysAgo(1), photos: [],
  },
  {
    id: "ORD-1026", customerId: "cust-4", customerName: "Ayesha Siddiqui", customerMobile: "0345-7777777",
    branchId: "br-1",
    items: [
      { id: "i-6", garmentType: "blanket", serviceType: "wash_fold", quantity: 2 },
      { id: "i-7", garmentType: "sofa_cover", serviceType: "wash_fold", quantity: 1 },
    ],
    status: "out_for_delivery", subtotal: 360, discount: 36, total: 324, paid: 324, balance: 0,
    paymentMethod: "online", isExpress: true, deliveryPreference: "fold",
    createdAt: daysAgo(1), expectedAt: daysFromNow(0), photos: [], driverId: "drv-1",
  },
  {
    id: "ORD-1027", customerId: "cust-6", customerName: "Mariam Iqbal", customerMobile: "0312-6666666",
    branchId: "br-3",
    items: [
      { id: "i-8", garmentType: "carpet", serviceType: "premium", quantity: 1 },
    ],
    status: "received", subtotal: 500, discount: 50, total: 450, paid: 450, balance: 0,
    paymentMethod: "cash", isExpress: false, deliveryPreference: "fold",
    createdAt: daysAgo(0), expectedAt: daysFromNow(3), photos: [],
  },
  {
    id: "ORD-1028", customerId: "cust-5", customerName: "Usman Tariq", customerMobile: "0302-8888888",
    branchId: "br-2",
    items: [
      { id: "i-9", garmentType: "shirt", serviceType: "iron_only", quantity: 8 },
    ],
    status: "ironing", subtotal: 480, discount: 0, total: 480, paid: 480, balance: 0,
    paymentMethod: "cash", isExpress: false, deliveryPreference: "hanger",
    createdAt: daysAgo(1), expectedAt: daysFromNow(0), photos: [],
  },
  {
    id: "ORD-1029", customerId: "cust-1", customerName: "Bilal Ahmed", customerMobile: "0321-1234567",
    branchId: "br-1",
    items: [
      { id: "i-10", garmentType: "suit", serviceType: "premium", quantity: 3 },
    ],
    status: "quality_check", subtotal: 1500, discount: 150, total: 1350, paid: 1350, balance: 0,
    paymentMethod: "card", isExpress: false, deliveryPreference: "hanger",
    createdAt: daysAgo(2), expectedAt: daysFromNow(0), photos: [],
  },
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: "emp-1", name: "Ahmed Khan",  mobile: "0300-1111111", role: "admin",          branchId: "br-1", salary: 80000, ordersProcessed: 0,   productivityScore: 95, joinedAt: daysAgo(365), active: true },
  { id: "emp-2", name: "Sara Malik",  mobile: "0300-2222222", role: "manager",        branchId: "br-2", salary: 60000, ordersProcessed: 245, productivityScore: 92, joinedAt: daysAgo(200), active: true },
  { id: "emp-3", name: "Imran Ali",   mobile: "0300-3333333", role: "cashier",        branchId: "br-1", salary: 35000, ordersProcessed: 412, productivityScore: 88, joinedAt: daysAgo(150), active: true },
  { id: "emp-4", name: "Yousuf Raza",  mobile: "0300-4444444", role: "washer",         branchId: "br-1", salary: 30000, ordersProcessed: 567, productivityScore: 91, joinedAt: daysAgo(120), active: true },
  { id: "emp-5", name: "Tariq Mehmood",mobile: "0300-5555555", role: "iron_man",       branchId: "br-1", salary: 30000, ordersProcessed: 489, productivityScore: 89, joinedAt: daysAgo(100), active: true },
  { id: "emp-6", name: "Kashif Iqbal", mobile: "0300-6666666", role: "delivery_rider", branchId: "br-1", salary: 28000, ordersProcessed: 178, productivityScore: 94, joinedAt: daysAgo(80),  active: true },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: "inv-1", name: "Premium Detergent",  category: "detergent", quantity: 45, unit: "liters",   minStock: 20, costPerUnit: 350, supplier: "CleanCo",        branchId: "br-1" },
  { id: "inv-2", name: "Softener",            category: "chemical",  quantity: 12, unit: "liters",   minStock: 15, costPerUnit: 280, supplier: "CleanCo",        branchId: "br-1" },
  { id: "inv-3", name: "Stain Remover",       category: "chemical",  quantity: 28, unit: "bottles",  minStock: 10, costPerUnit: 450, supplier: "ProClean",       branchId: "br-1" },
  { id: "inv-4", name: "Plastic Hangers",     category: "hanger",    quantity: 850,unit: "pieces",   minStock: 200,costPerUnit: 12,  supplier: "Local Supplier", branchId: "br-1" },
  { id: "inv-5", name: "Poly Bags (Large)",   category: "packing",   quantity: 320,unit: "pieces",   minStock: 100,costPerUnit: 18,  supplier: "PackMart",       branchId: "br-1" },
  { id: "inv-6", name: "Garment Tags",        category: "tag",       quantity: 78, unit: "pieces",   minStock: 200,costPerUnit: 5,   supplier: "PrintWell",      branchId: "br-1" },
  { id: "inv-7", name: "Bleach",              category: "chemical",  quantity: 8,  unit: "liters",   minStock: 10, costPerUnit: 220, supplier: "CleanCo",        branchId: "br-2" },
  { id: "inv-8", name: "Perfume Spray",       category: "chemical",  quantity: 35, unit: "bottles",  minStock: 15, costPerUnit: 380, supplier: "FreshScent",     branchId: "br-1" },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: "act-1", type: "order_created", message: "New order ORD-1027 created for Mariam Iqbal",     timestamp: daysAgo(0) },
  { id: "act-2", type: "order_status",  message: "Order ORD-1024 marked as Ready",                  timestamp: daysAgo(0) },
  { id: "act-3", type: "delivery",      message: "Kashif Iqbal delivered order ORD-1025",          timestamp: daysAgo(1) },
  { id: "act-4", type: "payment",       message: "Payment received: Rs 1,080 from Bilal Ahmed",     timestamp: daysAgo(1) },
  { id: "act-5", type: "customer_added",message: "New VIP customer Mariam Iqbal added",            timestamp: daysAgo(1) },
  { id: "act-6", type: "feedback",      message: "5-star feedback received from Fatima Khan",     timestamp: daysAgo(2) },
  { id: "act-7", type: "order_created", message: "New express order ORD-1026 created",              timestamp: daysAgo(1) },
];

export const MOCK_COUPONS: Coupon[] = [
  { id: "cpn-1", code: "EID30",    discount: 30, validTill: daysFromNow(30), usageCount: 12, maxUsage: 100, active: true },
  { id: "cpn-2", code: "SUMMER20", discount: 20, validTill: daysFromNow(45), usageCount: 45, maxUsage: 200, active: true },
  { id: "cpn-3", code: "VIP50",    discount: 50, validTill: daysFromNow(60), usageCount: 5,  maxUsage: 50,  active: true },
];

export const MOCK_FEEDBACK: Feedback[] = [
  { id: "fb-1", orderId: "ORD-1025", customerId: "cust-3", customerName: "Hamza Sheikh", rating: 5, serviceRating: 5, deliveryRating: 5, staffRating: 5, comment: "Excellent service!", createdAt: daysAgo(1) },
  { id: "fb-2", orderId: "ORD-1018", customerId: "cust-2", customerName: "Fatima Khan", rating: 4, serviceRating: 5, deliveryRating: 4, staffRating: 4, comment: "Good but delivery was a bit late", createdAt: daysAgo(3) },
  { id: "fb-3", orderId: "ORD-1014", customerId: "cust-4", customerName: "Ayesha Siddiqui", rating: 5, serviceRating: 5, deliveryRating: 5, staffRating: 5, createdAt: daysAgo(5) },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: "drv-1", name: "Kashif Iqbal", vehicle: "Bike - AXR 123",  mobile: "0300-6666666", active: true, assignedOrders: ["ORD-1026"] },
  { id: "drv-2", name: "Asad Mehmood", vehicle: "Bike - BLB 456",  mobile: "0300-7777777", active: true, assignedOrders: [] },
  { id: "drv-3", name: "Faizan Ahmed", vehicle: "Car - CDC 789",   mobile: "0300-8888888", active: true, assignedOrders: [] },
];

// Generate 12 months of sales data
export function generateSalesData() {
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const base = [180000, 195000, 220000, 240000, 265000, 290000, 310000, 285000, 320000, 355000, 380000, 425000];
  return months.map((m, i) => ({
    month: m,
    revenue: base[i],
    orders: Math.floor(base[i] / 480),
  }));
}

export function generateDailyData() {
  return Array.from({ length: 7 }).map((_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    orders: [12, 19, 15, 22, 28, 35, 24][i],
    revenue: [5800, 9200, 7100, 10500, 13500, 17000, 11500][i],
  }));
}
