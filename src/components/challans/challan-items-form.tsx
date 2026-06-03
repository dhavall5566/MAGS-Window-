"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileSelect } from "@/components/shared/profile-select";
import { Plus, Trash2 } from "lucide-react";

export type ChallanLineItem = {
  profileId: string;
  quantity: number;
  length: number;
  weight: number;
  remarks?: string;
};

interface ProfileOption {
  id: string;
  profileCode: string;
  profileName: string;
  imageUrl?: string | null;
  weightPerMeter: number;
  currentStock?: number;
}

interface ChallanItemsFormProps {
  profiles: ProfileOption[];
  items: ChallanLineItem[];
  onChange: (items: ChallanLineItem[]) => void;
}

export function ChallanItemsForm({ profiles, items, onChange }: ChallanItemsFormProps) {
  const addLine = () => {
    onChange([
      ...items,
      { profileId: "", quantity: 1, length: 6, weight: 0 },
    ]);
  };

  const updateLine = (index: number, patch: Partial<ChallanLineItem>) => {
    const next = [...items];
    const line = { ...next[index], ...patch };
    const profile = profiles.find((p) => p.id === line.profileId);
    if (profile && (patch.length !== undefined || patch.quantity !== undefined || patch.profileId)) {
      line.weight =
        Math.round(line.quantity * line.length * profile.weightPerMeter * 100) / 100;
    }
    next[index] = line;
    onChange(next);
  };

  const removeLine = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Line {index + 1}</span>
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <ProfileSelect
            profiles={profiles}
            value={item.profileId}
            onChange={(id) => updateLine(index, { profileId: id })}
            showStock
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Qty (pcs)</Label>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateLine(index, { quantity: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Length (MTR)</Label>
              <Input
                type="number"
                step="0.1"
                value={item.length}
                onChange={(e) =>
                  updateLine(index, { length: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (KG)</Label>
              <Input
                type="number"
                step="0.01"
                value={item.weight || ""}
                onChange={(e) =>
                  updateLine(index, { weight: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addLine} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add Profile Line
      </Button>
    </div>
  );
}
