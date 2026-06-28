"use client";

import { useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildReportPreviewContent,
  type ReportApiData,
} from "@/lib/report-content";
import { getReportTypeLabel } from "@/lib/report-form";
import { formatDate } from "@/lib/utils";
import type { Report } from "@/types";

interface ReportPreviewDialogProps {
  report: Report | null;
  reportData: ReportApiData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportPreviewDialog({
  report,
  reportData,
  open,
  onOpenChange,
}: ReportPreviewDialogProps) {
  const [downloading, setDownloading] = useState(false);

  const content = useMemo(
    () => (report ? buildReportPreviewContent(report, reportData) : null),
    [report, reportData]
  );

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const { generateReportPDF } = await import("@/lib/report-pdf");
      await generateReportPDF(report, reportData);
    } catch (error) {
      console.error("Report PDF download failed:", error);
      alert("Could not generate the report PDF. Please refresh the page and try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <Eye className="h-5 w-5 text-primary" />
            {report?.name ?? "Report Preview"}
          </DialogTitle>
        </DialogHeader>

        {report && content && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{report.reportNo}</span>
              <Badge variant="outline">{getReportTypeLabel(report.type)}</Badge>
              <span>
                {formatDate(report.dateFrom)} – {formatDate(report.dateTo)}
              </span>
              <span>Created {formatDate(report.createdAt)}</span>
            </div>

            {content.metrics.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {content.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}

            {content.tables.map((table) => (
              <div key={table.title} className="space-y-2">
                <h3 className="text-sm font-semibold">{table.title}</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {table.headers.map((header) => (
                          <th
                            key={header}
                            className="px-4 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-foreground/85"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b last:border-0">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" onClick={handleDownload} disabled={downloading}>
                <Download className="h-4 w-4" />
                {downloading ? "Generating…" : "Download PDF"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
