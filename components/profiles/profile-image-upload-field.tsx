"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadProfileImage } from "@/lib/upload-image";

type ProfileImageUploadFieldProps = {
  id?: string;
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
};

export function ProfileImageUploadField({
  id = "design",
  label = "Profile Image",
  value,
  onChange,
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

  return (
    <div className="space-y-2 col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-4">
        <label
          htmlFor={id}
          className="form-field relative flex h-20 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-dashed hover:bg-muted/50"
        >
          {value ? (
            <Image
              src={value}
              alt="Profile preview"
              width={112}
              height={80}
              className="h-full w-full rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="mt-1 text-xs text-muted-foreground">Upload image</span>
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
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {uploading && (
        <p className="text-xs text-muted-foreground">Uploading to ImageKit...</p>
      )}
    </div>
  );
}
