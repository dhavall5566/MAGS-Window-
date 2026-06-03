import { Badge } from "@/components/ui/badge";

export function DemoModeBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <Badge variant="secondary" className="text-xs font-normal">
      Demo Mode
    </Badge>
  );
}
