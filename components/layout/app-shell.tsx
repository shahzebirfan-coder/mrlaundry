"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen pb-20 lg:pb-0">
        <Header onMenuClick={() => setMobileNavOpen(!mobileNavOpen)} />
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Mobile slide-out menu */}
      {mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
