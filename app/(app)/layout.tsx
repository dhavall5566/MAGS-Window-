"use client";

import "@/lib/app-data-init";
import { AppShell } from "@/components/layout/app-shell";
import { StoreDataBootstrap } from "@/components/providers/store-data-bootstrap";
import { RoutePrefetcher } from "@/components/providers/route-prefetcher";
import { StoreHydration } from "@/components/providers/store-hydration";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <StoreHydration />
      <StoreDataBootstrap />
      <RoutePrefetcher />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 flex-1 overflow-x-hidden p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4 lg:p-6"
      >
        {children}
      </main>
    </AppShell>
  );
}
