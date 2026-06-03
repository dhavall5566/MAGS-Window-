"use client";

import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { CompanyContact } from "@/components/brand/company-contact";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [logs, setLogs] = useState<
    {
      action: string;
      entity: string;
      details?: string;
      createdAt: string;
      user: { name: string };
    }[]
  >([]);

  useEffect(() => {
    fetch("/api/activity-logs")
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Appearance, company contact, and system activity"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyContact variant="full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.action} — {log.entity}
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {log.user.name}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
