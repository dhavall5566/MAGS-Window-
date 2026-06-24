"use client";

import { formatProfileLengthLabel, getProfileLengths } from "@/lib/profile";
import type { Profile } from "@/types";

interface ProfileLengthsCellProps {
  profile: Profile;
}

export function ProfileLengthsCell({ profile }: ProfileLengthsCellProps) {
  const lengths = getProfileLengths(profile);

  if (lengths.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="tabular-nums text-sm">
      {lengths.map((length) => formatProfileLengthLabel(length)).join(", ")}
    </span>
  );
}
