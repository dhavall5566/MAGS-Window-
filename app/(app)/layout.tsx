"use client";

import { AppShell } from "@/components/layout/app-shell";
import { StoreDataBootstrap } from "@/components/providers/store-data-bootstrap";
import { StoreHydration } from "@/components/providers/store-hydration";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <StoreHydration />
      <StoreDataBootstrap />
      <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>
    </AppShell>
  );
}
