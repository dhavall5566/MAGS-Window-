"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import {
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  getUserAvatarInitials,
  userFormSchema,
  type UserFormData,
} from "@/lib/user-form";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { generateId } from "@/lib/utils";
import type { User } from "@/types";

interface AddUserDialogProps {
  existingEmails: string[];
  onSave: (user: User) => void;
}

export function AddUserDialog({ existingEmails, onSave }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      role: "production_user",
      department: "",
      status: "active",
    },
  });

  const closeDialog = () => {
    setOpen(false);
    reset();
    setEmailError(null);
  };

  const onSubmit = (data: UserFormData) => {
    const email = data.email.trim().toLowerCase();
    if (existingEmails.some((value) => value.toLowerCase() === email)) {
      setEmailError("A user with this email already exists");
      return;
    }

    const name = data.name.trim();
    onSave({
      id: generateId("usr"),
      name,
      email: data.email.trim(),
      role: data.role,
      department: data.department.trim(),
      status: data.status,
      avatar: getUserAvatarInitials(name),
    });
    closeDialog();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a system user with role-based access for MAGS operations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="User details">
            <FormField
              label="Full Name"
              htmlFor="name"
              required
              error={resolveFieldError(isSubmitted, errors.name)}
            >
              <Input
                id="name"
                placeholder="e.g. Rajesh Kumar"
                aria-invalid={fieldInvalid(isSubmitted, errors.name)}
                {...register("name")}
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="email"
              required
              error={resolveFieldError(isSubmitted, errors.email) ?? emailError ?? undefined}
            >
              <Input
                id="email"
                type="email"
                placeholder="e.g. user@mags.in"
                aria-invalid={fieldInvalid(isSubmitted, errors.email) || Boolean(emailError)}
                {...register("email", { onChange: () => setEmailError(null) })}
              />
            </FormField>
            <FormField
              label="Department"
              htmlFor="department"
              required
              error={resolveFieldError(isSubmitted, errors.department)}
            >
              <Input
                id="department"
                placeholder="e.g. Store"
                aria-invalid={fieldInvalid(isSubmitted, errors.department)}
                {...register("department")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Access">
            <FormField
              label="Role"
              htmlFor="role"
              required
              error={resolveFieldError(isSubmitted, errors.role)}
            >
              <SearchableSelect
                id="role"
                value={watch("role")}
                onValueChange={(value) =>
                  setValue("role", value as UserFormData["role"], { shouldValidate: isSubmitted })
                }
                options={USER_ROLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                placeholder="Select role"
                searchPlaceholder="Search role…"
                aria-invalid={fieldInvalid(isSubmitted, errors.role)}
              />
            </FormField>
            <FormField
              label="Status"
              htmlFor="status"
              required
              error={resolveFieldError(isSubmitted, errors.status)}
            >
              <SearchableSelect
                id="status"
                value={watch("status")}
                onValueChange={(value) =>
                  setValue("status", value as UserFormData["status"], { shouldValidate: isSubmitted })
                }
                options={USER_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                placeholder="Select status"
                searchPlaceholder="Search status…"
                aria-invalid={fieldInvalid(isSubmitted, errors.status)}
              />
            </FormField>
          </FormSection>

          <FormDialogActions
            onCancel={closeDialog}
            submitLabel="Save User"
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
