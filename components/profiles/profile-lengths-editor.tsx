"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROFILE_FIELD_LABELS } from "@/lib/profile-form";
import { cn } from "@/lib/utils";

interface ProfileLengthsEditorProps {
  value: number[];
  onChange: (lengths: number[]) => void;
  error?: string;
  className?: string;
}

export function ProfileLengthsEditor({
  value,
  onChange,
  error,
  className,
}: ProfileLengthsEditorProps) {
  const lengths = value.length > 0 ? value : [0];

  const updateLength = (index: number, next: number) => {
    const updated = [...lengths];
    updated[index] = next;
    onChange(updated);
  };

  const addLength = () => {
    onChange([...lengths, 0]);
  };

  const removeLength = (index: number) => {
    if (lengths.length <= 1) return;
    onChange(lengths.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{PROFILE_FIELD_LABELS.rmm}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLength}>
          <Plus className="h-3.5 w-3.5" />
          Add length
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lengths.map((length, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={length || ""}
              onChange={(event) => updateLength(index, Number(event.target.value) || 0)}
              placeholder={`Length ${index + 1}`}
              className="tabular-nums"
            />
            {lengths.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => removeLength(index)}
                aria-label="Remove length"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
