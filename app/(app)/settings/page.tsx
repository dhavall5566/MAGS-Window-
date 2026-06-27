"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Building2, ListOrdered, User } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { CompanySettingsPanel } from "@/components/settings/company-settings-panel";
import { NavigationSettingsPanel } from "@/components/settings/navigation-settings-panel";
import { SettingsTabsList, SettingsTabsTrigger } from "@/components/settings/settings-tabs-nav";
import { UserSettingsPanel } from "@/components/settings/user-settings-panel";

const SETTINGS_TAB_KEY = "mags-settings-tab";

const SETTINGS_TABS = [
  {
    value: "user",
    label: "User",
    description: "Profile & permissions",
    icon: User,
  },
  {
    value: "tabs",
    label: "Tab Settings",
    description: "Sidebar navigation",
    icon: ListOrdered,
  },
  {
    value: "company",
    label: "Company",
    description: "Business details",
    icon: Building2,
  },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["value"];

function readStoredSettingsTab(): SettingsTab {
  const stored = window.localStorage.getItem(SETTINGS_TAB_KEY);
  return SETTINGS_TABS.some((tab) => tab.value === stored)
    ? (stored as SettingsTab)
    : "user";
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("user");
  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTab>>(
    () => new Set(["user"])
  );

  useEffect(() => {
    const stored = readStoredSettingsTab();
    setActiveTab(stored);
    setVisitedTabs(new Set([stored]));
  }, []);

  const handleTabChange = useCallback((value: string) => {
    const next = value as SettingsTab;
    startTransition(() => {
      setActiveTab(next);
      setVisitedTabs((current) => {
        if (current.has(next)) return current;
        return new Set([...current, next]);
      });
    });
    window.localStorage.setItem(SETTINGS_TAB_KEY, next);
  }, []);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="User, navigation, and company preferences"
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col gap-6 lg:flex-row lg:items-start"
      >
        <SettingsTabsList aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <SettingsTabsTrigger
              key={tab.value}
              value={tab.value}
              description={tab.description}
              icon={<tab.icon className="h-4 w-4" />}
            >
              {tab.label}
            </SettingsTabsTrigger>
          ))}
        </SettingsTabsList>

        <div className="min-w-0 flex-1">
          {visitedTabs.has("user") ? (
            <TabsContent
              value="user"
              persist
              className="mt-0 data-[state=inactive]:hidden"
            >
              <UserSettingsPanel />
            </TabsContent>
          ) : null}
          {visitedTabs.has("tabs") ? (
            <TabsContent
              value="tabs"
              persist
              className="mt-0 data-[state=inactive]:hidden"
            >
              <NavigationSettingsPanel />
            </TabsContent>
          ) : null}
          {visitedTabs.has("company") ? (
            <TabsContent
              value="company"
              persist
              className="mt-0 data-[state=inactive]:hidden"
            >
              <CompanySettingsPanel />
            </TabsContent>
          ) : null}
        </div>
      </Tabs>
    </div>
  );
}
