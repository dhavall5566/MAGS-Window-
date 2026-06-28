"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { Building2, ListOrdered, Shield } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CompanySettingsPanel } from "@/components/settings/company-settings-panel";
import { NavigationSettingsPanel } from "@/components/settings/navigation-settings-panel";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsTabsList, SettingsTabsTrigger } from "@/components/settings/settings-tabs-nav";
import { UserSettingsPanel } from "@/components/settings/user-settings-panel";

const SETTINGS_TAB_KEY = "mags-settings-tab";

const SETTINGS_TABS = [
  {
    value: "user",
    label: "Access Control",
    description: "Profiles, roles & permissions",
    icon: Shield,
  },
  {
    value: "tabs",
    label: "Navigation",
    description: "Sidebar menu configuration",
    icon: ListOrdered,
  },
  {
    value: "company",
    label: "Organization",
    description: "Company & contact details",
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
  const [visitedTabs, setVisitedTabs] = useState<Set<SettingsTab>>(() => new Set(["user"]));

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
    <div className="-mx-3 -mt-3 min-h-[calc(100vh-4rem)] bg-muted/20 sm:-mx-4 sm:-mt-4 lg:-mx-6 lg:-mt-6">
      <SettingsPageHeader
        title="Settings"
        description="Centralized administration for user access, application navigation, and organization profile."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col">
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

        <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {visitedTabs.has("user") ? (
            <TabsContent value="user" persist className="mt-0 data-[state=inactive]:hidden">
              <UserSettingsPanel />
            </TabsContent>
          ) : null}
          {visitedTabs.has("tabs") ? (
            <TabsContent value="tabs" persist className="mt-0 data-[state=inactive]:hidden">
              <NavigationSettingsPanel />
            </TabsContent>
          ) : null}
          {visitedTabs.has("company") ? (
            <TabsContent value="company" persist className="mt-0 data-[state=inactive]:hidden">
              <CompanySettingsPanel />
            </TabsContent>
          ) : null}
        </div>
      </Tabs>
    </div>
  );
}
