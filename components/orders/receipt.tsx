"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { GARMENT_TYPES, SERVICE_TYPES } from "@/lib/types";
import type { Order } from "@/lib/types";
import { Printer, X } from "lucide-react";

interface ReceiptProps {
  order: Order;
  shopName: string;
  shopTagline: string;
  shopPhone: string;
  shopWhatsapp: string;
  shopAddress: string;
  currency: string;
  onClose?: () => void;
  autoPrint?: boolean;
}

export function Receipt({
  order, shopName, shopTagline, shopPhone, shopWhatsapp, shopAddress, currency, onClose, autoPrint,
}: ReceiptProps) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("qrcode").then((QRCode) => {
        QRCode.toDataURL(
          `https://mrlaundry.pk/track/${order.id}`,
          { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } }
        ).then(setQrUrl).catch(() => {});
      });
    }
  }, [order.id]);

  useEffect(() => {
    if (autoPrint && typeof window !== "undefined") {
      setTimeout(() => window.print(), 500);
    }
  }, [autoPrint]);

  function printReceipt() {
    window.print();
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white text-black font-mono text-sm max-w-[320px] mx-auto shadow-2xl print:shadow-none print:max-w-full">
      {/* Action bar (hidden on print) */}
      {onClose && (
        <div className="no-print flex items-center justify-between p-3 bg-slate-100 border-b border-slate-300">
          <p className="text-xs font-bold text-black">RECEIPT PREVIEW (80mm Thermal)</p>
          <div className="flex gap-2">
            <button onClick={printReceipt} className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-slate-800">
              <Printer className="w-3 h-3" /> PRINT
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Receipt Body - 80mm Thermal Optimized */}
      <div className="p-3 print:p-2" style={{ fontFamily: "'Courier New', monospace" }}>

        {/* ========== HEADER WITH BRAND LOGO ========== */}
        <div className="text-center">
          {/* Mr Laundry Logo - B&W for thermal */}
          <div className="flex justify-center mb-2">
            <img
              src="/mr-laundry-logo.jpeg"
              alt="Mr Laundry Logo"
              className="h-14 w-auto object-contain"
              style={{ filter: "grayscale(100%) contrast(200%) brightness(0)" }}
            />
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-wider">{shopName}</h1>
          <p className="text-[10px] italic">{shopTagline}</p>
          <div className="text-[9px] mt-1 leading-tight">
            <p>{shopAddress}</p>
            <p>WhatsApp: {shopWhatsapp} | Mob: {shopPhone}</p>
          </div>
        </div>

        <div className="text-center my-2 text-[10px] font-bold">================================</div>

        {/* ========== BIG INVOICE NUMBER BOX ========== */}
        <div className="border-2 border-black p-2 my-2 text-center">
          <p className="text-[9px] font-bold tracking-widest uppercase">INVOICE NUMBER</p>
          <p className="text-2xl font-extrabold tracking-wider leading-tight mt-1" style={{ fontSize: "24px" }}>
            {order.id}
          </p>
        </div>

        <div className="text-center my-2 text-[10px] font-bold">================================</div>

        {/* ========== TOTAL ITEMS & DELIVERY PREFERENCE ========== */}
        <div className="border-2 border-black p-2 my-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Total Items */}
            <div className="text-center border-r border-black pr-2">
              <p className="text-[9px] font-bold tracking-wider uppercase">Total Items</p>
              <p className="text-3xl font-extrabold leading-none mt-1" style={{ fontSize: "32px" }}>
                {totalItems}
              </p>
              <p className="text-[8px] uppercase mt-0.5">Pieces</p>
            </div>

            {/* Hanger / Fold */}
            <div className="text-center pl-2">
              <p className="text-[9px] font-bold tracking-wider uppercase">Delivery</p>
              <p className="text-2xl font-extrabold mt-1 leading-none" style={{ fontSize: "20px" }}>
                [{order.deliveryPreference === "hanger" ? "HANGER" : "FOLD"}]
              </p>
              <p className="text-[8px] uppercase mt-1 font-bold">
                {order.deliveryPreference === "hanger" ? "Ready to Wear" : "Neatly Packed"}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center my-2 text-[10px] font-bold">================================</div>

        {/* ========== DELIVERY DATE BOX ========== */}
        <div className="border-2 border-black p-2 my-2 text-center">
          <p className="text-[9px] font-bold tracking-widest uppercase">Delivery Date</p>
          <p className="text-lg font-extrabold mt-0.5 leading-tight" style={{ fontSize: "16px" }}>
            {formatDate(order.expectedAt)}
          </p>
          {order.isExpress && (
            <p className="text-[10px] font-extrabold mt-1 uppercase border border-black inline-block px-2 py-0.5">
              *** EXPRESS SERVICE ***
            </p>
          )}
        </div>

        <div className="text-center my-2 text-[10px]">--------------------------------</div>

        {/* ========== ORDER META ========== */}
        <div className="text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          <div>
            <span className="font-bold">Customer:</span> {order.customerName}
          </div>
          <div>
            <span className="font-bold">Mobile:</span> {order.customerMobile}
          </div>
        </div>

        <div className="text-center my-2 text-[10px]">--------------------------------</div>

        {/* ========== ITEMS TABLE ========== */}
        <div className="text-[11px]">
          <div className="font-bold border-b border-black pb-1 mb-1 flex justify-between">
            <span>ITEM</span>
            <span>QTY x RATE = AMT</span>
          </div>
          {order.items.map((item) => {
            const svc = SERVICE_TYPES.find((s) => s.value === item.serviceType)!;
            const garment = GARMENT_TYPES.find((g) => g.value === item.garmentType)!;
            const itemTotal = svc.price * item.quantity;
            return (
              <div key={item.id} className="mb-2">
                <div className="flex justify-between font-bold">
                  <span>{item.customName || garment.label}</span>
                  <span>{item.quantity}x</span>
                </div>
                <div className="text-[9px] italic">
                  [{svc.label}{item.color ? ` | ${item.color}` : ""}{item.brand ? ` | ${item.brand}` : ""}]
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>@ {formatCurrency(svc.price, currency)}</span>
                  <span className="font-bold">{formatCurrency(itemTotal, currency)}</span>
                </div>
                {item.notes && (
                  <div className="text-[9px] italic mt-0.5">
                    Note: {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center my-2 text-[10px]">--------------------------------</div>

        {/* ========== TOTALS ========== */}
        <div className="text-[11px] space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(order.subtotal, currency)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(order.discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-black pt-1 text-base font-extrabold" style={{ fontSize: "14px" }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(order.total, currency)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Paid ({order.paymentMethod.toUpperCase()}):</span>
            <span className="font-bold">[{formatCurrency(order.paid, currency)}]</span>
          </div>
          {order.balance > 0 && (
            <div className="flex justify-between border border-black p-1 mt-1 font-bold">
              <span>BALANCE DUE:</span>
              <span>{formatCurrency(order.balance, currency)}</span>
            </div>
          )}
        </div>

        <div className="text-center my-2 text-[10px]">================================</div>

        {/* ========== DELIVERY DATE REMINDER ========== */}
        <div className="text-center text-[11px] my-2 border border-black p-2">
          <p className="font-bold uppercase">*** Delivery Date ***</p>
          <p className="text-base font-extrabold mt-1" style={{ fontSize: "14px" }}>
            {formatDate(order.expectedAt)}
          </p>
          <p className="text-[9px] mt-1 italic">Please collect on this date</p>
        </div>

        <div className="text-center my-2 text-[10px]">--------------------------------</div>

        {/* ========== QR CODE ========== */}
        {qrUrl && (
          <div className="text-center my-2">
            <img src={qrUrl} alt="QR Code" className="w-28 h-28 mx-auto" style={{ filter: "grayscale(100%) contrast(200%)" }} />
            <p className="text-[9px] mt-1 font-bold">SCAN TO TRACK ORDER</p>
            <p className="text-[8px]">mrlaundry.pk/track/{order.id}</p>
          </div>
        )}

        <div className="text-center my-2 text-[10px]">================================</div>

        {/* ========== THANK YOU ========== */}
        <div className="text-center text-[10px] italic my-2">
          <p className="font-bold">*** Thank You ***</p>
          <p>for choosing {shopName}</p>
          <p>Quality Dry Cleaner Service</p>
        </div>

        <div className="text-center my-2 text-[10px]">================================</div>

        {/* ========== CELINESOFT FOOTER ========== */}
        <div className="text-center text-[9px] my-2 pt-2 border-t border-black">
          <p className="font-bold text-[10px]">CelineSoft</p>
          <p className="font-bold uppercase">Software Designed by CelineSoft</p>
          <p>www.celinesoft.com</p>
        </div>

        <div className="text-center text-[8px] mt-3 italic">
          Printed: {new Date().toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
        </div>

      </div>
    </div>
  );
}
