"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { getDefaultUser } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getDefaultUser();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userId={user?.id}
        role={user?.role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-72 flex min-w-0 flex-col min-h-screen">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
