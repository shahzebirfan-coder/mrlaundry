"use client";

import Image from "next/image";
import { Printer, X } from "lucide-react";
import { SERVICE_TYPES, GARMENT_TYPES } from "@/lib/types";
import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface GarmentTagProps {
  order: Order;
  shopName: string;
  shopTagline: string;
  shopPhone: string;
  shopWhatsapp: string;
  shopAddress: string;
  onClose?: () => void;
  autoPrint?: boolean;
  quantity?: number; // Print multiple tags
}

const ALL_SERVICES = [
  { value: "wash_fold", label: "Wash & Fold" },
  { value: "iron_only", label: "Iron" },
  { value: "carpet", label: "Carpet" },
  { value: "dry_clean", label: "Dry Clean" },
  { value: "curtain", label: "Curtains" },
  { value: "premium", label: "Comforter" },
];

export function GarmentTag({
  order, shopName, shopTagline, shopPhone, shopWhatsapp, shopAddress,
  onClose, autoPrint, quantity = 1,
}: GarmentTagProps) {
  function printTag() {
    window.print();
  }

  // Get unique services used in this order
  const usedServices = Array.from(new Set(order.items.map((i) => i.serviceType)));

  // Format address for one line
  const shortAddress = shopAddress.length > 40
    ? shopAddress.slice(0, 40) + "..."
    : shopAddress;

  return (
    <div className="bg-white text-black mx-auto" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* Action bar (hidden on print) */}
      {onClose && (
        <div className="no-print flex items-center justify-between p-3 bg-slate-100 border-b border-slate-300 mb-3">
          <p className="text-xs font-bold text-black">GARMENT TAG PREVIEW (60mm Thermal)</p>
          <div className="flex gap-2">
            <button onClick={printTag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-slate-800">
              <Printer className="w-3 h-3" /> PRINT {quantity > 1 ? `${quantity} TAGS` : "TAG"}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tags - print multiple if requested */}
      {Array.from({ length: quantity }).map((_, idx) => (
        <div
          key={idx}
          className="tag-container mx-auto bg-white text-black relative"
          style={{
            width: "60mm",
            minHeight: "85mm",
            padding: "4mm 3mm 4mm 3mm",
            border: "2px solid #0891b2",
            borderRadius: "4px",
            pageBreakAfter: idx < quantity - 1 ? "always" : "auto",
          }}
        >
          {/* Hanging hole at top */}
          <div className="text-center mb-1">
            <div
              style={{
                width: "4mm",
                height: "4mm",
                borderRadius: "50%",
                border: "1px dashed #000",
                margin: "0 auto 1mm auto",
              }}
            />
          </div>

          {/* Header */}
          <div className="text-center mb-1.5">
            <div className="flex justify-center mb-0.5">
              <img
                src="/mr-laundry-logo.jpeg"
                alt="Logo"
                style={{
                  height: "10mm",
                  width: "auto",
                  filter: "grayscale(100%) contrast(200%) brightness(0)",
                }}
              />
            </div>
            <h1 className="text-[11px] font-extrabold uppercase tracking-wide" style={{ fontSize: "11px", lineHeight: "1" }}>
              {shopName}
            </h1>
            <p className="text-[8px] italic" style={{ fontSize: "8px", lineHeight: "1.1" }}>
              {shopTagline}
            </p>
          </div>

          {/* Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

          {/* Serial No */}
          <div className="mb-0.5" style={{ fontSize: "8px", lineHeight: "1.3" }}>
            <span className="font-bold">Serial No:</span>{" "}
            <span className="font-extrabold" style={{ fontSize: "10px" }}>{order.id}</span>
          </div>

          {/* Customer Name */}
          <div className="mb-0.5" style={{ fontSize: "8px", lineHeight: "1.3" }}>
            <span className="font-bold">Customer Name:</span>
            <div style={{ borderBottom: "1px solid #000", minHeight: "3mm", paddingTop: "0.5mm", paddingLeft: "1mm" }}>
              {order.customerName}
            </div>
          </div>

          {/* Contact No */}
          <div className="mb-1" style={{ fontSize: "8px", lineHeight: "1.3" }}>
            <span className="font-bold">Contact No:</span>
            <div style={{ borderBottom: "1px solid #000", minHeight: "3mm", paddingTop: "0.5mm", paddingLeft: "1mm" }}>
              {order.customerMobile}
            </div>
          </div>

          {/* Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

          {/* Service Type */}
          <div className="mb-1" style={{ fontSize: "8px" }}>
            <p className="font-bold mb-0.5">Service Type:</p>
            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
              {ALL_SERVICES.map((service) => {
                const isUsed = usedServices.includes(service.value as any);
                return (
                  <div key={service.value} className="flex items-center gap-1">
                    <span style={{
                      display: "inline-block",
                      width: "2.5mm",
                      height: "2.5mm",
                      border: "1px solid #000",
                      borderRadius: "1px",
                      position: "relative",
                      flexShrink: 0,
                    }}>
                      {isUsed && (
                        <span style={{
                          position: "absolute",
                          top: "0",
                          left: "0",
                          right: "0",
                          bottom: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "8px",
                          fontWeight: "bold",
                          lineHeight: "1",
                        }}>✓</span>
                      )}
                    </span>
                    <span>{service.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

          {/* Shop Address */}
          <div style={{ fontSize: "7px", lineHeight: "1.2" }}>
            <p>
              <span style={{ marginRight: "1mm" }}>📍</span>
              <span className="font-bold">Shop Address:</span>
            </p>
            <p className="mt-0.5" style={{ paddingLeft: "3mm" }}>
              {shortAddress}
            </p>
            <p className="mt-1">
              <span style={{ marginRight: "1mm" }}>📞</span>
              <span className="font-bold">{shopPhone}</span>
            </p>
          </div>

          {/* Separator */}
          <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

          {/* Footer */}
          <div className="text-center" style={{ fontSize: "7px", fontStyle: "italic" }}>
            Thank you for choosing {shopName}!
          </div>

          {/* Bottom hole (cutout indicator) */}
          <div className="text-center mt-1">
            <div
              style={{
                width: "3mm",
                height: "3mm",
                borderRadius: "50%",
                border: "1px dashed #666",
                margin: "0 auto",
              }}
            />
          </div>
        </div>
      ))}

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: 60mm 85mm;
            margin: 0;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 60mm !important;
          }
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .tag-container, .tag-container * { visibility: visible !important; }
          .tag-container {
            position: relative !important;
            margin: 0 !important;
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
