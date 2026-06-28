"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileFilters } from "@/components/shared/use-profile-filters";
import { AddProfileDialog } from "@/components/profiles/add-profile-dialog";
import { EditProfileDialog } from "@/components/profiles/edit-profile-dialog";
import { ProfileImagePreviewDialog } from "@/components/profiles/profile-image-preview-dialog";
import { ProfilePriceHistoryDialog } from "@/components/profiles/profile-price-history-dialog";
import { ProfileRowActions } from "@/components/profiles/profile-row-actions";
import { Badge } from "@/components/ui/badge";
import { useCachedApiList } from "@/hooks/use-cached-api-list";
import { useModuleCrud } from "@/hooks/use-module-crud";
import { syncListCache } from "@/lib/list-cache-sync";
import {
  createProfileApi,
  deleteProfileApi,
  updateProfileApi,
  upsertProfileApi,
} from "@/lib/profile-api";
import {
  getProfileCodeValue,
  getProfileDesignImage,
  getProfileDisplayName,
  getProfileDyeCode,
  getProfileWeightPerMeter,
  getProfileStatusLabel,
  normalizeProfile,
} from "@/lib/profile";
import { PROFILE_FIELD_LABELS } from "@/lib/profile-form";
import { useAppStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";
import type { Profile } from "@/types";

function mergeProfileLists(apiProfiles: Profile[], storeProfiles: Profile[]): Profile[] {
  const merged = apiProfiles.map(normalizeProfile);
  storeProfiles.forEach((profile) => {
    const normalized = normalizeProfile(profile);
    const existing = merged.find((item) => item?.id === normalized?.id);
    if (existing) {
      Object.assign(existing, normalized);
    } else {
      merged.push(normalized);
    }
  });
  return merged.map(normalizeProfile);
}

export default function ProfilesPage() {
  const { canCreate, canUpdate, canDelete } = useModuleCrud("profiles");
  const addProfile = useAppStore((s) => s.addProfile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const deleteProfile = useAppStore((s) => s.deleteProfile);
  const setProfiles = useAppStore((s) => s.setProfiles);
  const toggleProfileStatus = useAppStore((s) => s.toggleProfileStatus);
  const storeProfiles = useAppStore((s) => s.profiles);
  const { apiItems: apiProfiles, isLoading } = useCachedApiList<
    Profile,
    "profiles"
  >("/api/profiles", "profiles", {
    mapItem: normalizeProfile,
    hasSeedData: () => (useAppStore.getState().profiles ?? []).length > 0,
    getStoreFallback: () => useAppStore.getState().profiles ?? [],
  });
  const profiles = useMemo(
    () => mergeProfileLists(apiProfiles, storeProfiles ?? []),
    [apiProfiles, storeProfiles]
  );
  const showLoading = isLoading && profiles.length === 0;
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [historyProfile, setHistoryProfile] = useState<Profile | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { filterContent, filtersActive, clearFilters, matchesProfile } =
    useProfileFilters(profiles);

  const handleAddProfile = useCallback(
    async (profile: Profile) => {
      addProfile(profile);
      syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
      const saved = await createProfileApi(profile);
      if (saved) {
        updateProfile(saved.id, saved);
        syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
      }
    },
    [addProfile, updateProfile]
  );

  const handleUpdateProfile = useCallback(
    async (id: string, updates: Partial<Profile>) => {
      const current =
        profiles.find((profile) => profile.id === id) ??
        (useAppStore.getState().profiles ?? []).find((profile) => profile.id === id);
      if (!current) return;

      const nextProfile = normalizeProfile({ ...current, ...updates });
      updateProfile(id, updates);
      syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
      const saved = await upsertProfileApi(nextProfile);
      if (saved) {
        updateProfile(saved.id, saved);
        syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
      }
    },
    [profiles, updateProfile]
  );

  const handleToggleStatus = useCallback(
    async (id: string) => {
      const current =
        profiles.find((profile) => profile.id === id) ??
        (useAppStore.getState().profiles ?? []).find((profile) => profile.id === id);
      if (!current) return;
      const nextStatus = current.status === "active" ? "inactive" : "active";
      const nextProfile = normalizeProfile({ ...current, status: nextStatus });

      toggleProfileStatus(id);
      syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
      const saved = await upsertProfileApi(nextProfile);
      if (!saved) {
        toggleProfileStatus(id);
        syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
        alert("Could not update profile status. Please check that the backend is running.");
      } else {
        updateProfile(saved.id, saved);
        syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
      }
    },
    [profiles, toggleProfileStatus, updateProfile]
  );

  const handleDeleteProfile = useCallback(
    async (profile: Profile) => {
      const label = getProfileDisplayName(profile) || profile.name || profile.code;
      if (!confirm(`Delete profile ${label}? This cannot be undone.`)) return;

      deleteProfile(profile.id);
      syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);

      const ok = await deleteProfileApi(profile.id);
      if (!ok) {
        setProfiles([...(useAppStore.getState().profiles ?? []), profile]);
        syncListCache("/api/profiles", "profiles", useAppStore.getState().profiles ?? []);
        alert("Could not delete profile. Please check that the backend is running.");
      }
    },
    [deleteProfile, setProfiles]
  );

  const handleEdit = useCallback((row: Profile) => {
    setEditingProfile(row);
    setEditOpen(true);
  }, []);

  const handlePriceHistory = useCallback((row: Profile) => {
    setHistoryProfile(row);
    setHistoryOpen(true);
  }, []);

  const handleImagePreview = useCallback((row: Profile) => {
    if (!getProfileDesignImage(row)) return;
    setPreviewProfile(row);
    setPreviewOpen(true);
  }, []);

  const handleProfileSearch = useCallback((profile: Profile, query: string) => {
    const q = query.toLowerCase();
    const name = profile.name?.toLowerCase() ?? "";
    const code = getProfileCodeValue(profile).toLowerCase();
    const dyeCode = getProfileDyeCode(profile).toLowerCase();
    return name.includes(q) || code.includes(q) || dyeCode.includes(q);
  }, []);


  const filteredProfiles = useMemo(
    () => profiles.filter(matchesProfile),
    [profiles, matchesProfile]
  );

  const columns = useMemo(
    () => [
      {
        key: "image",
        header: "Profile Image",
        className: "w-[88px]",
        align: "center" as const,
        sortable: false,
        hideBelow: "md" as const,
        render: (row: Profile) => {
          const inactive = row.status === "inactive";
          const imageSrc = getProfileDesignImage(row);
          const emptySlot = (
            <div
              className="mx-auto h-10 w-16 rounded border border-dashed border-muted-foreground/20 bg-muted/20"
              aria-hidden
            />
          );

          if (!imageSrc) {
            return inactive ? <div className="opacity-60">{emptySlot}</div> : emptySlot;
          }

          const image = (
            <Image
              src={imageSrc}
              alt={row.name}
              width={64}
              height={40}
              className="rounded object-contain"
              unoptimized
            />
          );

          if (inactive) {
            return (
              <div
                className="cursor-not-allowed rounded border bg-white/60 p-0.5 opacity-60"
                aria-hidden
              >
                {image}
              </div>
            );
          }

          return (
            <button
              type="button"
              onClick={() => handleImagePreview(row)}
              className="rounded border bg-white p-0.5 transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`View image for ${row.name}`}
            >
              {image}
            </button>
          );
        },
      },
      {
        key: "name",
        header: "Profile Name",
        className: "min-w-[160px] font-medium",
        align: "left" as const,
        render: (row: Profile) => row.name,
      },
      {
        key: "seriesName",
        header: "Profile Code",
        className: "whitespace-nowrap font-mono text-xs font-medium",
        align: "left" as const,
        sortValue: (row: Profile) => getProfileCodeValue(row),
        render: (row: Profile) => getProfileCodeValue(row),
      },
      {
        key: "dyeCode",
        header: PROFILE_FIELD_LABELS.dyeCode,
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
        hideBelow: "md" as const,
        sortValue: (row: Profile) => getProfileDyeCode(row),
        render: (row: Profile) => getProfileDyeCode(row) || "\u2014",
      },
      {
        key: "rmm",
        header: "RMM",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        hideBelow: "lg" as const,
        sortValue: (row: Profile) => row.powderCoatingRmm ?? 0,
        render: (row: Profile) => {
          const rmmValue = row.powderCoatingRmm ?? 0;
          return rmmValue > 0 ? formatNumber(rmmValue, 2) : "\u2014";
        },
      },
      {
        key: "weightPerMeter",
        header: PROFILE_FIELD_LABELS.kgPerMeter,
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        hideBelow: "md" as const,
        sortValue: (row: Profile) => getProfileWeightPerMeter(row),
        render: (row: Profile) => {
          const value = getProfileWeightPerMeter(row);
          return value > 0 ? formatNumber(value, 4) : "\u2014";
        },
      },
      {
        key: "status",
        header: "Status",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: Profile) => (
          <Badge variant={row.status === "active" ? "success" : "secondary"}>
            {getProfileStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "whitespace-nowrap",
        align: "right" as const,
        sticky: true,
        render: (row: Profile) => (
          <ProfileRowActions
            profile={row}
            onEdit={handleEdit}
            onPriceHistory={handlePriceHistory}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteProfile}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ),
      },
    ],
    [canDelete, canUpdate, handleDeleteProfile, handleEdit, handleImagePreview, handlePriceHistory, handleToggleStatus]
  );

  return (
    <div>
      <PageHeader
        title="Profile Master"
        description="Manage aluminium extrusion profile specifications"
      >
        {canCreate ? (
          <AddProfileDialog existingProfiles={profiles} onSave={handleAddProfile} />
        ) : null}
      </PageHeader>
      <DataTable
        tableId="profiles"
        data={filteredProfiles}
        columns={columns}
        isLoading={showLoading}
        loadingMessage="Loading profiles\u2026"
        searchFilter={handleProfileSearch}
        searchPlaceholder="Search by profile name, code, or dye code..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
        isRowMuted={(row) => row.status === "inactive"}
      />
      <EditProfileDialog
        profile={editingProfile}
        existingProfiles={profiles}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleUpdateProfile}
      />
      <ProfileImagePreviewDialog
        profile={previewProfile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      <ProfilePriceHistoryDialog
        profile={historyProfile}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
