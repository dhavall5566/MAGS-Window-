"use client";

import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-section";
import { COMPANY } from "@/lib/company";

const CONTACT_ITEMS = [
  {
    icon: MapPin,
    label: "Registered address",
    value: COMPANY.address.full,
    href: null as string | null,
  },
  {
    icon: Phone,
    label: "Primary contact",
    value: `${COMPANY.contact.phone} (${COMPANY.contact.name})`,
    href: `tel:${COMPANY.contact.phone.replace(/\s/g, "")}`,
  },
  {
    icon: Phone,
    label: "Alternate phone",
    value: COMPANY.contact.phoneAlt,
    href: `tel:${COMPANY.contact.phoneAlt.replace(/\s/g, "")}`,
  },
  {
    icon: Mail,
    label: "Email",
    value: COMPANY.contact.email,
    href: `mailto:${COMPANY.contact.email}`,
  },
  {
    icon: Globe,
    label: "Website",
    value: COMPANY.contact.website,
    href: COMPANY.contact.websiteUrl,
  },
] as const;

export function CompanySettingsPanel() {
  return (
    <SettingsPanel>
      <SettingsSection
        first
        title="Organization profile"
        description={COMPANY.description}
        contentClassName="pt-0"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border/80 bg-muted/15 p-5 sm:p-6">
            <Logo variant="default" showTagline href={null} />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{COMPANY.tagline}</p>
            <dl className="mt-6 space-y-3 border-t border-border/70 pt-5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Legal name
                </dt>
                <dd className="mt-1 text-sm font-medium">{COMPANY.legalName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Product
                </dt>
                <dd className="mt-1 text-sm font-medium">{COMPANY.productName}</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/80">
            <div className="border-b border-border/70 bg-muted/30 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contact & location
              </p>
            </div>
            <ul className="divide-y divide-border/70">
              {CONTACT_ITEMS.map((item) => (
                <li key={item.label} className="flex gap-3 px-4 py-3.5 sm:px-5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="mt-1 block text-sm font-medium text-foreground hover:text-primary"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                        {item.value}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SettingsSection>
    </SettingsPanel>
  );
}
