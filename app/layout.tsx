import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Mr Laundry POS - Quality Dry Cleaner Service",
  description: "Mr Laundry - Quality Dry Cleaner Service. Modern POS system for laundry businesses. Software designed by CelineSoft.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
