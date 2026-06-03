import { DemoModeBadge } from "./demo-mode-badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  demoMode?: boolean;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, demoMode, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <DemoModeBadge show={demoMode} />
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
