"use client";

import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";

export function WorkflowDefaultsCard() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          Workflow Defaults
        </CardTitle>
        <CardDescription>
          Smart defaults that speed up challans and stock checks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default-length">Default challan length (m)</Label>
            <Input
              id="default-length"
              type="number"
              min="0.5"
              step="0.5"
              value={settings.defaultChallanLength}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isNaN(value) && value > 0) {
                  updateSettings({ defaultChallanLength: value });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Pre-fills new challan line items when you add profiles.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="low-stock-threshold">Low stock alert (kg)</Label>
            <Input
              id="low-stock-threshold"
              type="number"
              min="0"
              step="1"
              value={settings.lowStockThresholdKg}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isNaN(value) && value >= 0) {
                  updateSettings({ lowStockThresholdKg: value });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Profiles at or below this weight count as low stock.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="highlight-low-stock">Highlight low stock rows</Label>
            <p className="text-xs text-muted-foreground">
              Stock Master rows below the threshold are greyed with a warning badge.
            </p>
          </div>
          <Switch
            id="highlight-low-stock"
            checked={settings.highlightLowStock}
            onCheckedChange={(checked) => updateSettings({ highlightLowStock: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
