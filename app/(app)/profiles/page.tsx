"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchJson } from "@/lib/fetch-json";
import {
  getProfileCodeValue,
  getProfileDesignImage,
  getProfileDyeCode,
  getPrimaryProfileLength,
  getProfileRmmValue,
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
  const addProfile = useAppStore((s) => s.addProfile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const toggleProfileStatus = useAppStore((s) => s.toggleProfileStatus);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [historyProfile, setHistoryProfile] = useState<Profile | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { filterContent, filtersActive, clearFilters, matchesProfile } =
    useProfileFilters(profiles);

  useEffect(() => {
    let cancelled = false;

    fetchJson<{ profiles?: Profile[] }>("/api/profiles")
      .then((data) => {
        if (cancelled) return;
        const apiProfiles = data?.profiles ?? [];
        const storeProfiles = useAppStore.getState().profiles ?? [];
        setProfiles(mergeProfileLists(apiProfiles, storeProfiles));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddProfile = (profile: Profile) => {
    addProfile(profile);
    setProfiles((prev) => [...(prev ?? []), profile]);
  };

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

  const handleUpdateProfile = (id: string, updates: Partial<Profile>) => {
    updateProfile(id, updates);
    setProfiles((prev) =>
      (prev ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleToggleStatus = useCallback(
    (id: string) => {
      toggleProfileStatus(id);
      setProfiles((prev) =>
        (prev ?? []).map((p) =>
          p.id === id
            ? { ...p, status: p.status === "active" ? "inactive" : "active" }
            : p
        )
      );
    },
    [toggleProfileStatus]
  );

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
        sortValue: (row: Profile) => row.code || row.seriesName,
        render: (row: Profile) => row.code || row.seriesName,
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
        sortValue: (row: Profile) => getProfileRmmValue(row),
        render: (row: Profile) => {
          const length = getPrimaryProfileLength(row) || row.rmm || 0;
          const rmmValue = getProfileRmmValue(row, Number(length) || undefined);
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
          />
        ),
      },
    ],
    [handleEdit, handleImagePreview, handlePriceHistory, handleToggleStatus]
  );

  return (
    <div>
      <PageHeader
        title="Profile Master"
        description="Manage aluminium extrusion profile specifications"
      >
        <AddProfileDialog existingProfiles={profiles} onSave={handleAddProfile} />
      </PageHeader>
      <DataTable
        tableId="profiles"
        data={filteredProfiles}
        columns={columns}
        isLoading={isLoading}
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
