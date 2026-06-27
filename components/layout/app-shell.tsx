"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { getDefaultUser } from "@/lib/auth";
import { KeyboardNavigationProvider } from "@/components/providers/keyboard-navigation-provider";

const skipLinkClassName =
  "sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-nowrap focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:[clip:auto]";

const MainContent = memo(function MainContent({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">{children}</div>;
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const user = getDefaultUser();

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      if (!open) return open;
      menuButtonRef.current?.focus({ preventScroll: true });
      return false;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className={skipLinkClassName}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus({ preventScroll: true });
        }}
      >
        Skip to main content
      </a>
      <KeyboardNavigationProvider onCloseMobileSidebar={handleCloseMobileSidebar} />
      <Sidebar
        userId={user?.id}
        role={user?.role}
        open={sidebarOpen}
        onClose={closeSidebar}
      />
      <div className="lg:pl-72 flex min-w-0 flex-col min-h-screen">
        <Header
          user={user}
          menuButtonRef={menuButtonRef}
          sidebarOpen={sidebarOpen}
          onMenuClick={openSidebar}
        />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}
