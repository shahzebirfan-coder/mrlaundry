"use client";

import { useState } from "react";
import { usePOSStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  GARMENT_TYPES, SERVICE_TYPES, type GarmentType, type ServiceType,
  type OrderItem, type GarmentCondition, type StainType, type Order,
} from "@/lib/types";
import {
  Plus, Trash2, Camera, Sparkles, Check, X, Save,
  User, Phone, MapPin, CreditCard, Zap, Crown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency, generateOrderId } from "@/lib/utils";
import { Receipt } from "@/components/orders/receipt";
import { GarmentTag } from "@/components/orders/garment-tag";

export default function NewOrderPage() {
  const router = useRouter();
  const {
    customers, orders, addOrder, addCustomer, addActivity, currency, activeBranchId, shopName, shopTagline, shopPhone, shopWhatsapp, shopAddress,
  } = usePOSStore();

  // Customer selection
  const [customerId, setCustomerId] = useState<string>("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkIn, setWalkIn] = useState({ name: "", mobile: "", address: "" });

  // Items
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<OrderItem>>({
    garmentType: "shirt",
    serviceType: "wash_iron",
    quantity: 1,
  });

  // Order details
  const [isExpress, setIsExpress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online" | "credit">("cash");
  const [deliveryPreference, setDeliveryPreference] = useState<"hanger" | "fold">("fold");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [notes, setNotes] = useState("");

  // AI Stain modal
  const [stainModal, setStainModal] = useState(false);
  const [detectedStains, setDetectedStains] = useState<StainType[]>([]);

  // Receipt modal
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);

  const customer = customers.find((c) => c.id === customerId);

  const subtotal = items.reduce((sum, item) => {
    const svc = SERVICE_TYPES.find((s) => s.value === item.serviceType);
    return sum + (svc?.price || 0) * item.quantity;
  }, 0);

  const expressMultiplier = isExpress ? 1.5 : 1;
  const membershipDiscount = customer?.membershipTier === "platinum" ? 0.15 :
                              customer?.membershipTier === "gold" ? 0.10 :
                              customer?.membershipTier === "silver" ? 0.05 : 0;
  const totalDiscount = discount + subtotal * membershipDiscount;
  const total = Math.round(subtotal * expressMultiplier - totalDiscount);
  const balance = total - paid;

  function addItem() {
    if (!currentItem.garmentType || !currentItem.serviceType || !currentItem.quantity) return;
    const newItem: OrderItem = {
      id: `i-${Date.now()}`,
      garmentType: currentItem.garmentType as GarmentType,
      customName: currentItem.customName,
      serviceType: currentItem.serviceType as ServiceType,
      quantity: currentItem.quantity,
      color: currentItem.color,
      brand: currentItem.brand,
      notes: currentItem.notes,
      condition: currentItem.condition,
      stainDetected: detectedStains.length ? detectedStains : undefined,
    };
    setItems([...items, newItem]);
    setCurrentItem({ garmentType: "shirt", serviceType: "wash_iron", quantity: 1 });
    setDetectedStains([]);
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function saveWalkIn() {
    if (!walkIn.name || !walkIn.mobile) return;
    const newCustomer = {
      id: `cust-${Date.now()}`,
      name: walkIn.name,
      mobile: walkIn.mobile,
      address: walkIn.address,
      membershipTier: "none" as const,
      totalSpent: 0, loyaltyPoints: 0, outstandingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    addCustomer(newCustomer);
    setCustomerId(newCustomer.id);
    setWalkInOpen(false);
    setWalkIn({ name: "", mobile: "", address: "" });
  }

  function submitOrder() {
    if (!customer || items.length === 0) return;

    const orderId = generateOrderId(orders.map((o) => o.id));
    const expected = new Date();
    expected.setDate(expected.getDate() + (isExpress ? 1 : 3));

    const newOrder = {
      id: orderId,
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      branchId: activeBranchId,
      items,
      status: "received" as const,
      subtotal: Math.round(subtotal * expressMultiplier),
      discount: Math.round(totalDiscount),
      total,
      paid,
      balance,
      paymentMethod,
      isExpress,
      deliveryPreference,
      notes,
      photos: [],
      createdAt: new Date().toISOString(),
      expectedAt: expected.toISOString(),
    };

    addOrder(newOrder);
    addActivity({
      id: `act-${Date.now()}`,
      type: "order_created",
      message: `New order ${orderId} created for ${customer.name}`,
      timestamp: new Date().toISOString(),
    });

    setReceiptOrder(newOrder);
  }

  function closeReceipt() {
    setReceiptOrder(null);
    router.push(`/orders`);
  }

  // Mock AI stain detection
  function simulateAIStain() {
    setStainModal(true);
    setTimeout(() => {
      const possibleStains: StainType[] = ["oil", "ink", "blood", "food", "mud", "sweat", "wine", "chocolate"];
      const detected: StainType[] = [];
      const count = 1 + Math.floor(Math.random() * 2);
      while (detected.length < count) {
        const s = possibleStains[Math.floor(Math.random() * possibleStains.length)];
        if (!detected.includes(s)) detected.push(s);
      }
      setDetectedStains(detected);
    }, 1800);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Create New Order</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add items, select services, and complete the order
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Customer</CardTitle>
                <CardSubtitle>Select existing or add walk-in</CardSubtitle>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Customer</label>
                <select
                  className="input mt-1"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">-- Choose customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.mobile} {c.membershipTier !== "none" && `• ${c.membershipTier.toUpperCase()}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => setWalkInOpen(true)} className="btn-secondary w-full">
                  <Plus className="w-4 h-4" /> Walk-in Customer
                </button>
              </div>
            </div>

            {customer && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 border border-primary-200 dark:border-primary-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{customer.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{customer.mobile} {customer.address && `• ${customer.address}`}</p>
                  </div>
                  {customer.membershipTier !== "none" && (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-white text-xs font-bold">
                      <Crown className="w-3 h-3" /> {customer.membershipTier.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div><p className="text-slate-500">Total Spent</p><p className="font-bold">{formatCurrency(customer.totalSpent, currency)}</p></div>
                  <div><p className="text-slate-500">Loyalty Pts</p><p className="font-bold text-primary-600">{customer.loyaltyPoints}</p></div>
                  <div><p className="text-slate-500">Discount</p><p className="font-bold text-emerald-600">{Math.round(membershipDiscount * 100)}%</p></div>
                </div>
              </div>
            )}
          </Card>

          {/* Add Item */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">📦 Add Items</CardTitle>
                <CardSubtitle>Select garment type and service</CardSubtitle>
              </div>
            </CardHeader>

            {/* Garment Type */}
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Garment Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1 mb-4">
              {GARMENT_TYPES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setCurrentItem({ ...currentItem, garmentType: g.value })}
                  className={`p-3 rounded-xl text-center transition-all border ${
                    currentItem.garmentType === g.value
                      ? "bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/30"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300"
                  }`}
                >
                  <div className="text-2xl">{g.icon}</div>
                  <p className="text-xs font-medium mt-1">{g.label}</p>
                </button>
              ))}
            </div>

            {/* Service Type */}
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Service Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1 mb-4">
              {SERVICE_TYPES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setCurrentItem({ ...currentItem, serviceType: s.value })}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    currentItem.serviceType === s.value
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs opacity-80">{formatCurrency(s.price, currency)} • {s.days}d</p>
                </button>
              ))}
            </div>

            {/* Quantity + Custom Name */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="input mt-1"
                  value={currentItem.quantity || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Color</label>
                <input
                  className="input mt-1"
                  placeholder="White, Navy..."
                  value={currentItem.color || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, color: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Brand</label>
                <input
                  className="input mt-1"
                  placeholder="Gul Ahmed..."
                  value={currentItem.brand || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, brand: e.target.value })}
                />
              </div>
              {currentItem.garmentType === "custom" && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Custom Name</label>
                  <input
                    className="input mt-1"
                    placeholder="e.g. Wedding Dress"
                    value={currentItem.customName || ""}
                    onChange={(e) => setCurrentItem({ ...currentItem, customName: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notes (e.g. "stain on collar")</label>
              <input
                className="input mt-1"
                placeholder="Special instructions..."
                value={currentItem.notes || ""}
                onChange={(e) => setCurrentItem({ ...currentItem, notes: e.target.value })}
              />
            </div>

            {/* Garment Condition Checklist */}
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">
              Garment Condition Checklist
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {[
                { key: "torn", label: "Torn" },
                { key: "stained", label: "Stained" },
                { key: "missing_button", label: "Missing Button" },
                { key: "color_fade", label: "Color Fade" },
                { key: "damage", label: "Damage" },
              ].map((c) => {
                const checked = (currentItem.condition as any)?.[c.key] || false;
                return (
                  <label key={c.key} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer border transition-all ${
                    checked ? "bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setCurrentItem({
                        ...currentItem,
                        condition: { ...currentItem.condition, [c.key]: e.target.checked } as GarmentCondition,
                      })}
                      className="rounded"
                    />
                    <span className="text-xs font-medium">{c.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Photo Upload + AI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <Camera className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs text-slate-500 mt-2">Click or drag to upload garment photo</p>
              </div>
              <button
                onClick={simulateAIStain}
                className="border-2 border-violet-300 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30 rounded-xl p-4 text-center hover:shadow-lg transition-all"
              >
                <Sparkles className="w-8 h-8 mx-auto text-violet-500" />
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mt-2">AI Stain Recognition</p>
                <p className="text-[10px] text-violet-600 dark:text-violet-400">Detect & suggest treatment</p>
              </button>
            </div>

            {detectedStains.length > 0 && (
              <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 mb-4">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">🔍 AI Detected Stains:</p>
                <div className="flex flex-wrap gap-1">
                  {detectedStains.map((s) => (
                    <span key={s} className="badge-info !bg-violet-200 !text-violet-800 dark:!bg-violet-900/50 dark:!text-violet-200">
                      {s.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={addItem} className="btn-primary w-full">
              <Plus className="w-4 h-4" /> Add Item to Order
            </button>
          </Card>

          {/* Items List */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>📋 Order Items ({items.length})</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const svc = SERVICE_TYPES.find((s) => s.value === item.serviceType)!;
                  return (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                      <div className="text-2xl">{GARMENT_TYPES.find((g) => g.value === item.garmentType)?.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.quantity}× {item.customName || item.garmentType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {svc.label} {item.color && `• ${item.color}`} {item.brand && `• ${item.brand}`}
                        </p>
                        {item.notes && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">📝 {item.notes}</p>}
                      </div>
                      <p className="font-bold text-sm">{formatCurrency(svc.price * item.quantity, currency)}</p>
                      <button onClick={() => removeItem(item.id)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <Card className="sticky top-20">
            <CardHeader>
              <div>
                <CardTitle>🧾 Order Summary</CardTitle>
                <CardSubtitle>{shopName}</CardSubtitle>
              </div>
            </CardHeader>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isExpress} onChange={(e) => setIsExpress(e.target.checked)} />
                <span className="text-sm font-medium flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" /> Express Service (+50%)
                </span>
              </label>

              {/* 🔥 HANGER / FOLD Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Delivery Preference <span className="text-slate-400">(Hanger ya Fold?)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setDeliveryPreference("hanger")}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      deliveryPreference === "hanger"
                        ? "bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/30"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-300"
                    }`}
                  >
                    <div className="text-2xl">🪝</div>
                    <p className="text-sm font-bold mt-1">HANGER</p>
                    <p className="text-[10px] opacity-80">On hangers ready to wear</p>
                  </button>
                  <button
                    onClick={() => setDeliveryPreference("fold")}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      deliveryPreference === "fold"
                        ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300"
                    }`}
                  >
                    <div className="text-2xl">📦</div>
                    <p className="text-sm font-bold mt-1">FOLD</p>
                    <p className="text-[10px] opacity-80">Neatly folded & packed</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Payment Method</label>
                <select
                  className="input mt-1"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="online">📱 Online</option>
                  <option value="credit">📒 Credit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Discount ({currency})</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Paid ({currency})</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={paid || ""}
                    onChange={(e) => setPaid(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Order Notes</label>
                <textarea
                  className="input mt-1"
                  rows={2}
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Math.round(subtotal * expressMultiplier), currency)}</span>
                </div>
                {membershipDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Member Discount ({Math.round(membershipDiscount * 100)}%)</span>
                    <span>-{formatCurrency(Math.round(subtotal * expressMultiplier * membershipDiscount), currency)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Manual Discount</span>
                    <span>-{formatCurrency(discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Total</span>
                  <span>{formatCurrency(total, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Paid</span>
                  <span className="text-primary-600">{formatCurrency(paid, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Balance</span>
                  <span className={balance > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                    {formatCurrency(balance, currency)}
                  </span>
                </div>
              </div>

              <button
                onClick={submitOrder}
                disabled={!customer || items.length === 0}
                className="btn-primary w-full !py-3 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Order
              </button>

              <p className="text-[10px] text-center text-slate-500">
                {shopPhone}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Walk-in Modal */}
      <Modal open={walkInOpen} onClose={() => setWalkInOpen(false)} title="Walk-in Customer">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold">Name *</label>
            <input className="input mt-1" value={walkIn.name} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold">Mobile *</label>
            <input className="input mt-1" value={walkIn.mobile} onChange={(e) => setWalkIn({ ...walkIn, mobile: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold">Address</label>
            <input className="input mt-1" value={walkIn.address} onChange={(e) => setWalkIn({ ...walkIn, address: e.target.value })} />
          </div>
          <button onClick={saveWalkIn} className="btn-primary w-full"><Save className="w-4 h-4" /> Add Customer</button>
        </div>
      </Modal>

      {/* AI Stain Modal */}
      <Modal open={stainModal} onClose={() => setStainModal(false)} title="🤖 AI Stain Recognition">
        <div className="space-y-4">
          {detectedStains.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/30 grid place-items-center mb-3">
                <Sparkles className="w-8 h-8 text-violet-500 animate-pulse" />
              </div>
              <p className="font-semibold">Analyzing garment image...</p>
              <p className="text-xs text-slate-500 mt-1">AI is detecting stains and recommending treatment</p>
              <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" style={{ width: "70%" }} />
              </div>
            </div>
          ) : (
            <div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/30 dark:to-fuchsia-900/30">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">✅ Analysis Complete</p>
                <p className="text-sm mt-2 font-semibold">Detected Stains:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {detectedStains.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-sm font-medium border border-violet-200">
                      {s.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mt-4 mb-2">💡 Recommended Treatment:</p>
                <div className="space-y-2">
                  {detectedStains.map((s) => (
                    <div key={s} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm font-medium capitalize">{s} stain</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s === "oil" && "Apply solvent-based pre-treatment, then wash in hot water."}
                        {s === "ink" && "Use alcohol-based remover, gently blot, then cold wash."}
                        {s === "blood" && "Soak in cold water with enzyme cleaner, avoid hot water."}
                        {s === "food" && "Pre-treat with stain remover, wash in warm water."}
                        {s === "mud" && "Let dry, brush off, then wash with detergent."}
                        {s === "sweat" && "Use baking soda paste, then wash in cold water."}
                        {s === "wine" && "Apply hydrogen peroxide, blot, then cold wash."}
                        {s === "chocolate" && "Soak in enzyme cleaner, then wash normally."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setStainModal(false)} className="btn-primary w-full mt-4">
                <Check className="w-4 h-4" /> Apply to Item
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt Modal */}
      {receiptOrder && (
        <Modal open={!!receiptOrder} onClose={closeReceipt} title="" size="md">
          <Receipt
            order={receiptOrder}
            shopName={shopName}
            shopTagline={shopTagline}
            shopPhone={shopPhone}
            shopWhatsapp={shopWhatsapp}
            shopAddress={shopAddress}
            currency={currency}
            onClose={closeReceipt}
            autoPrint={false}
          />
        </Modal>
      )}
    </div>
  );
}
