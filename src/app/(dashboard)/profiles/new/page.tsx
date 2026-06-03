"use client";

import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/profiles/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { profileSchema } from "@/lib/validations";

export default function NewProfilePage() {
  const router = useRouter();

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create profile");
      return;
    }
    toast.success("Profile created successfully");
    router.push("/profiles");
  };

  return (
    <div>
      <PageHeader title="Add Profile" description="Create a new aluminium profile master record" />
      <Card>
        <CardContent className="pt-6">
          <ProfileForm onSubmit={onSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
