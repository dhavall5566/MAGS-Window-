import Link from "next/link";
import { companyInfo } from "@/lib/company";
import { cn } from "@/lib/utils";
import { Mail, MapPin, Phone, Globe, User } from "lucide-react";

interface CompanyContactProps {
  variant?: "full" | "compact" | "footer" | "onDark";
  className?: string;
}

export function CompanyContact({ variant = "full", className }: CompanyContactProps) {
  if (variant === "footer") {
    return (
      <div className={cn("space-y-1 text-xs", className)}>
        <p className="font-medium">{companyInfo.name}</p>
        <p className="opacity-80">{companyInfo.tagline}</p>
        <p className="opacity-60">© {new Date().getFullYear()} {companyInfo.name}</p>
      </div>
    );
  }

  if (variant === "compact" || variant === "onDark") {
    const onDark = variant === "onDark";
    return (
      <div className={cn("space-y-2 text-sm", className)}>
        <p className={cn("font-semibold", onDark && "text-[#DFE5F5]")}>
          {companyInfo.name}
        </p>
        <p
          className={cn(
            "italic",
            onDark ? "text-[#DFE5F5]/80" : "text-muted-foreground"
          )}
        >
          {companyInfo.servicesTagline}
        </p>
        <a
          href={`tel:${companyInfo.phoneTel}`}
          className={cn(
            "flex items-center gap-2",
            onDark ? "text-[#DFE5F5] hover:text-white" : "hover:text-primary"
          )}
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {companyInfo.phone}
        </a>
        <a
          href={`mailto:${companyInfo.email}`}
          className={cn(
            "flex items-center gap-2",
            onDark ? "text-[#DFE5F5] hover:text-white" : "hover:text-primary"
          )}
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {companyInfo.email}
        </a>
        <Link
          href={companyInfo.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2",
            onDark ? "text-[#DFE5F5] hover:text-white" : "hover:text-primary"
          )}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          {companyInfo.website}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div>
        <h3 className="text-lg font-semibold">{companyInfo.name}</h3>
        <p className="text-sm text-muted-foreground">{companyInfo.tagline}</p>
        <p className="mt-1 text-sm font-medium text-primary">
          {companyInfo.servicesTagline}
        </p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p>{companyInfo.address.line1}</p>
            <p>{companyInfo.address.line2}</p>
            <p>
              {companyInfo.address.city} - {companyInfo.address.pincode}
            </p>
            <Link
              href={companyInfo.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-primary hover:underline"
            >
              View on Google Maps
            </Link>
          </div>
        </div>

        <a
          href={`mailto:${companyInfo.email}`}
          className="flex items-center gap-3 hover:text-primary"
        >
          <Mail className="h-4 w-4 shrink-0 text-primary" />
          {companyInfo.email}
        </a>

        <a
          href={`tel:${companyInfo.phoneTel}`}
          className="flex items-center gap-3 hover:text-primary"
        >
          <Phone className="h-4 w-4 shrink-0 text-primary" />
          {companyInfo.phone}
        </a>

        <Link
          href={companyInfo.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:text-primary"
        >
          <Globe className="h-4 w-4 shrink-0 text-primary" />
          {companyInfo.website}
        </Link>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sales
        </p>
        <div className="flex gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">{companyInfo.salesContact.name}</p>
            <p className="text-muted-foreground">{companyInfo.salesContact.title}</p>
            <a
              href={`tel:${companyInfo.salesContact.phoneTel}`}
              className="mt-1 inline-flex items-center gap-2 hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {companyInfo.salesContact.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
