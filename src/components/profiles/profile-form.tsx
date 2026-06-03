"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/validations";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadButton } from "@/lib/uploadthing";
import { Loader2 } from "lucide-react";
import Image from "next/image";

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  defaultValues?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  submitLabel?: string;
}

export function ProfileForm({
  defaultValues,
  onSubmit,
  submitLabel = "Save Profile",
}: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      status: "ACTIVE",
      standardLength: 6,
      lowStockThreshold: 50,
      ...defaultValues,
    },
  });

  const imageUrl = watch("imageUrl");
  const drawingUrl = watch("technicalDrawingUrl");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Profile Code *</Label>
          <Input {...register("profileCode")} placeholder="AP-6013" />
          {errors.profileCode && <p className="text-sm text-destructive">{errors.profileCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Profile Name *</Label>
          <Input {...register("profileName")} placeholder="Sliding Window Frame" />
          {errors.profileName && <p className="text-sm text-destructive">{errors.profileName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Series Name *</Label>
          <Input {...register("seriesName")} placeholder="6000 Series" />
        </div>
        <div className="space-y-2">
          <Label>Weight (KG/MTR) *</Label>
          <Input type="number" step="0.01" {...register("weightPerMeter")} />
        </div>
        <div className="space-y-2">
          <Label>Standard Length (MTR)</Label>
          <Input type="number" step="0.1" {...register("standardLength")} />
        </div>
        <div className="space-y-2">
          <Label>Low Stock Threshold (KG)</Label>
          <Input type="number" {...register("lowStockThreshold")} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            defaultValue={defaultValues?.status ?? "ACTIVE"}
            onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...register("description")} rows={3} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label>Profile Image</Label>
          {imageUrl && (
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
              <Image src={imageUrl} alt="Profile" fill className="object-cover" />
            </div>
          )}
          <UploadButton
            endpoint="profileImage"
            onClientUploadComplete={(res) => {
              if (res?.[0]) setValue("imageUrl", res[0].url);
            }}
          />
        </div>
        <div className="space-y-3">
          <Label>Technical Drawing</Label>
          {drawingUrl && <p className="text-xs text-muted-foreground truncate">{drawingUrl}</p>}
          <UploadButton
            endpoint="technicalDrawing"
            onClientUploadComplete={(res) => {
              if (res?.[0]) setValue("technicalDrawingUrl", res[0].url);
            }}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
