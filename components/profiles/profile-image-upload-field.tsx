"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadProfileImage } from "@/lib/upload-image";
import { cn } from "@/lib/utils";

type ProfileImageUploadFieldProps = {
  id?: string;
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  layout?: "inline" | "card" | "compact";
  className?: string;
};

export function ProfileImageUploadField({
  id = "design",
  label = "Profile Image",
  value,
  onChange,
  layout = "inline",
  className,
}: ProfileImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const localPreview = URL.createObjectURL(file);
    onChange(localPreview);
    setUploading(true);
    setError(null);

    try {
      const result = await uploadProfileImage(file);
      URL.revokeObjectURL(localPreview);
      onChange(result.url);
    } catch (uploadError) {
      URL.revokeObjectURL(localPreview);
      onChange(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const isCard = layout === "card" || layout === "compact";
  const isCompact = layout === "compact";

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div className={cn("flex gap-3", isCard ? "flex-col items-stretch" : "items-center")}>
        <label
          htmlFor={id}
          className={cn(
            "form-field relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 transition-colors hover:bg-muted/40",
            isCard ? (isCompact ? "min-h-[132px] w-full" : "min-h-[180px] w-full") : "h-20 w-28"
          )}
        >
          {value ? (
            <Image
              src={value}
              alt="Profile preview"
              width={isCard ? 320 : 112}
              height={isCard ? 180 : 80}
              className={cn(
                "rounded-lg object-contain",
                isCard ? "h-full max-h-[168px] w-full p-2" : "h-full w-full object-cover"
              )}
              unoptimized
            />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="mt-2 text-xs text-muted-foreground">Click to upload image</span>
              <span className="mt-0.5 text-[11px] text-muted-foreground/80">PNG, JPG up to 5MB</span>
            </>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className={cn(isCard && "self-start")}
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {uploading && (
        <p className="text-xs text-muted-foreground">Uploading to ImageKit...</p>
      )}
    </div>
  );
}
