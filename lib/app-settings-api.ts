import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { Report } from "@/types";
import type { AppSettings } from "@/lib/app-settings";
import type { ModuleRolePermissions, UserCrudOverrides } from "@/lib/role-permissions";

const SETTINGS_URL = "/api/app-settings";

export interface ClientAppState {
  navOrder?: string[] | null;
  hiddenNavHrefs?: string[];
  rolePermissions?: ModuleRolePermissions | null;
  userPermissionOverrides?: UserCrudOverrides;
  settings?: AppSettings | null;
  reports?: Report[];
}

export async function fetchAppSettingsApi(): Promise<ClientAppState> {
  return fetchJson<ClientAppState>(SETTINGS_URL, {});
}

export async function saveAppSettingsApi(partial: ClientAppState): Promise<ClientAppState | null> {
  try {
    const res = await fetch(SETTINGS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    invalidateJsonCache(SETTINGS_URL);
    if (!res.ok) return null;
    return (await res.json()) as ClientAppState;
  } catch {
    return null;
  }
}

export async function createReportRecordApi(report: Report): Promise<Report | null> {
  const current = await fetchAppSettingsApi();
  const reports = [...(current.reports ?? []), report];
  const saved = await saveAppSettingsApi({ reports });
  return saved?.reports?.find((entry) => entry.id === report.id) ?? report;
}

export async function deleteReportRecordApi(id: string): Promise<boolean> {
  const current = await fetchAppSettingsApi();
  const reports = (current.reports ?? []).filter((entry) => entry.id !== id);
  const saved = await saveAppSettingsApi({ reports });
  return Boolean(saved);
}
