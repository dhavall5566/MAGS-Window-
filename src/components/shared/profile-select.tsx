"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { Package } from "lucide-react";

interface ProfileOption {
  id: string;
  profileCode: string;
  profileName: string;
  imageUrl?: string | null;
  weightPerMeter?: number;
  currentStock?: number;
}

interface ProfileSelectProps {
  profiles: ProfileOption[];
  value: string;
  onChange: (id: string) => void;
  showStock?: boolean;
}

export function ProfileSelect({ profiles, value, onChange, showStock }: ProfileSelectProps) {
  const selected = profiles.find((p) => p.id === value);

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select profile" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.profileCode} — {p.profileName}
              {showStock && p.currentStock !== undefined && ` (${p.currentStock} KG)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <div className="flex items-center gap-4 rounded-lg border p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {selected.imageUrl ? (
              <Image src={selected.imageUrl} alt={selected.profileName} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold">{selected.profileCode}</p>
            <p className="text-sm text-muted-foreground">{selected.profileName}</p>
            {selected.weightPerMeter && (
              <p className="text-xs text-muted-foreground">
                {selected.weightPerMeter} KG/MTR
                {selected.currentStock !== undefined && ` · Stock: ${selected.currentStock} KG`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
