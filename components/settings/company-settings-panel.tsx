"use client";

import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { COMPANY } from "@/lib/company";

export function CompanySettingsPanel() {
  const { contact, address } = COMPANY;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company</CardTitle>
        <CardDescription>{COMPANY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Logo variant="default" showTagline href={null} />
        <p className="text-sm text-muted-foreground">{COMPANY.tagline}</p>
        <div className="space-y-3 text-sm">
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            {address.full}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            <span>
              {contact.phone}
              <span className="text-muted-foreground text-xs ml-1">({contact.name})</span>
            </span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            {contact.phoneAlt}
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-primary" />
            <a href={`mailto:${contact.email}`} className="hover:text-primary">
              {contact.email}
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-primary" />
            <a
              href={contact.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              {contact.website}
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
