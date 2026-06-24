"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProfileDesignImage } from "@/lib/profile";
import type { Profile } from "@/types";

interface ProfileImagePreviewDialogProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileImagePreviewDialog({
  profile,
  open,
  onOpenChange,
}: ProfileImagePreviewDialogProps) {
  const imageSrc = profile ? getProfileDesignImage(profile) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{profile?.name ?? "Profile Image"}</DialogTitle>
        </DialogHeader>
        {profile && imageSrc ? (
          <div className="flex items-center justify-center rounded-lg border bg-white p-6">
            <Image
              src={imageSrc}
              alt={profile.name}
              width={720}
              height={540}
              className="max-h-[70vh] w-full object-contain"
              unoptimized
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
