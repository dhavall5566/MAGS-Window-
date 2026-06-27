"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme === "dark" ? "dark" : "light") as ToasterProps["theme"]}
      position="top-center"
      richColors
      visibleToasts={3}
      expand={false}
      gap={10}
      offset={16}
      toastOptions={{
        classNames: {
          toast: "toast-3d pointer-events-auto",
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          success: "toast-3d-success",
          error: "toast-3d-error",
        },
      }}
      {...props}
    />
  );
}
