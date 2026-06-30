"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme === "dark" ? "dark" : "light") as ToasterProps["theme"]}
      position="top-center"
      visibleToasts={4}
      expand
      gap={12}
      offset={{ top: 72 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "app-toast-shell pointer-events-auto",
        },
      }}
      {...props}
    />
  );
}
