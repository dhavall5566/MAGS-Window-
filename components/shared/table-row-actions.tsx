import { cn } from "@/lib/utils";

interface TableRowActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function TableRowActions({ children, className }: TableRowActionsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5",
        className
      )}
    >
      {children}
    </div>
  );
}
