"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { Eye, FileDown, Trash2, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { CreateReportDialog } from "@/components/reports/create-report-dialog";
import { ReportPreviewDialog } from "@/components/reports/report-preview-dialog";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDateRangeFilter } from "@/components/shared/date-range-filter";
import { matchesPeriodOverlap } from "@/lib/date-filter";
import { formatDate } from "@/lib/utils";
import type { ReportApiData } from "@/lib/report-content";
import { getReportTypeLabel } from "@/lib/report-form";
import { useAppStore } from "@/lib/store";
import { useModuleCrud } from "@/hooks/use-module-crud";
import { useReportsAnalytics } from "@/hooks/use-reports-analytics";
import { createReportRecordApi, deleteReportRecordApi } from "@/lib/app-settings-api";
import { alertSyncFailure } from "@/lib/sync-alert";
import { notifyReportGenerated } from "@/lib/notifications/event-notifications";
import type { Report } from "@/types";

const ReportChartPanel = dynamic(
  () =>
    import("@/components/reports/report-chart-panel").then((mod) => mod.ReportChartPanel),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] rounded-xl border bg-card animate-pulse" />
    ),
  }
);

export default function ReportsPage() {
  const { canCreate, canRead, canDelete } = useModuleCrud("reports");
  const data = useReportsAnalytics();
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [chartReport, setChartReport] = useState<Report | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const reports = useAppStore((s) => s.reports);
  const addReport = useAppStore((s) => s.addReport);
  const deleteReport = useAppStore((s) => s.deleteReport);

  const handleAddReport = useCallback(
    async (report: Report) => {
      addReport(report);
      const saved = await createReportRecordApi(report);
      if (!saved) {
        deleteReport(report.id);
        alertSyncFailure("Report was saved locally but could not be synced to the server.");
        return;
      }
      notifyReportGenerated(report);
    },
    [addReport, deleteReport]
  );

  const handleDeleteReport = useCallback(
    async (report: Report) => {
      if (!confirm(`Delete report ${report.reportNo}?`)) return;
      deleteReport(report.id);
      if (chartReport?.id === report.id) setChartReport(null);
      const ok = await deleteReportRecordApi(report.id);
      if (!ok) {
        addReport(report);
        alert("Could not delete report from the server. It was restored locally.");
      }
    },
    [addReport, chartReport?.id, deleteReport]
  );

  const summary = useMemo(
    () => (data.summary ?? {}) as Record<string, number>,
    [data.summary]
  );
  const monthly = useMemo(
    () => (data.monthlyStockMovement ?? []) as ReportApiData["monthlyStockMovement"],
    [data.monthlyStockMovement]
  );
  const consumption = useMemo(
    () => (data.consumptionTrends ?? []) as ReportApiData["consumptionTrends"],
    [data.consumptionTrends]
  );
  const colors = useMemo(
    () => (data.colorDistribution ?? []) as ReportApiData["colorDistribution"],
    [data.colorDistribution]
  );
  const inventoryByCategory = useMemo(
    () =>
      (data.inventoryByCategory ?? []) as {
        category: string;
        stock: number;
        value: number;
      }[],
    [data.inventoryByCategory]
  );

  const sortedReports = useMemo(
    () =>
      [...(reports ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [reports]
  );

  const {
    dateFrom,
    dateTo,
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
  } = useDateRangeFilter({ label: "Period" });

  const filteredReports = useMemo(
    () =>
      sortedReports.filter((report) =>
        matchesPeriodOverlap(report.dateFrom, report.dateTo, dateFrom, dateTo)
      ),
    [sortedReports, dateFrom, dateTo]
  );

  const reportApiData = useMemo<ReportApiData>(
    () => ({
      monthlyStockMovement: monthly,
      consumptionTrends: consumption,
      colorDistribution: colors,
      inventoryByCategory,
      summary,
    }),
    [monthly, consumption, colors, inventoryByCategory, summary]
  );

  const handleDownloadReport = useCallback(
    async (report: Report) => {
      setDownloadingId(report.id);
      try {
        const { generateReportPDF } = await import("@/lib/report-pdf");
        await generateReportPDF(report, reportApiData);
      } catch (error) {
        console.error("Report PDF download failed:", error);
        alert("Could not generate the report PDF. Please refresh the page and try again.");
      } finally {
        setDownloadingId(null);
      }
    },
    [reportApiData]
  );

  const handleToggleChart = useCallback((report: Report) => {
    setChartReport((current) => (current?.id === report.id ? null : report));
  }, []);

  const reportColumns = [
    {
      key: "reportNo",
      header: "Report No",
      className: "whitespace-nowrap font-mono text-xs font-medium",
      align: "left" as const,
    },
    {
      key: "name",
      header: "Name",
      className: "min-w-[160px] font-medium",
      align: "left" as const,
    },
    {
      key: "type",
      header: "Type",
      className: "whitespace-nowrap",
      align: "left" as const,
      sortValue: (row: Report) => getReportTypeLabel(row.type),
      render: (row: Report) => (
        <Badge variant="outline" className="text-xs">
          {getReportTypeLabel(row.type)}
        </Badge>
      ),
    },
    {
      key: "period",
      header: "Period",
      className: "whitespace-nowrap text-muted-foreground",
      align: "left" as const,
      sortValue: (row: Report) => row.dateFrom,
      render: (row: Report) => `${formatDate(row.dateFrom)} – ${formatDate(row.dateTo)}`,
    },
    {
      key: "createdAt",
      header: "Created",
      className: "whitespace-nowrap text-muted-foreground",
      align: "left" as const,
      render: (row: Report) => formatDate(row.createdAt),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      align: "left" as const,
      render: () => (
        <Badge variant="success" className="whitespace-nowrap px-2.5 py-0.5 text-xs">
          Generated
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap",
      align: "right" as const,
      sticky: true,
      render: (row: Report) => (
        <TableRowActions>
          {canRead ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={chartReport?.id === row.id ? "h-8 w-8 text-primary" : "h-8 w-8"}
              aria-label="View chart"
              onClick={() => handleToggleChart(row)}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          ) : null}
          {canRead ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Preview report"
              onClick={() => {
                setPreviewReport(row);
                setPreviewOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          ) : null}
          {canRead ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Download PDF"
              disabled={downloadingId === row.id}
              onClick={() => handleDownloadReport(row)}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="Delete report"
              onClick={() => void handleDeleteReport(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </TableRowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reports" description="Analytics and operational reports for management">
        {canCreate ? (
          <CreateReportDialog existingReports={reports ?? []} onSave={handleAddReport} />
        ) : null}
      </PageHeader>

      <DataTable
        tableId="reports"
        data={filteredReports}
        columns={reportColumns}
        searchFilter={(row, query) => {
          const q = query.toLowerCase();
          return (
            row.reportNo.toLowerCase().includes(q) ||
            row.name.toLowerCase().includes(q) ||
            getReportTypeLabel(row.type).toLowerCase().includes(q)
          );
        }}
        searchPlaceholder="Search report no, name, or type..."
        emptyMessage="No reports yet. Click Create Report to generate one."
        filterContent={dateFilterContent}
        filtersActive={dateFiltersActive}
        onClearFilters={clearDateFilters}
      />

      {chartReport && (
        <ReportChartPanel
          report={chartReport}
          reportData={reportApiData}
          onClose={() => setChartReport(null)}
        />
      )}

      <ReportPreviewDialog
        report={previewReport}
        reportData={reportApiData}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewReport(null);
        }}
      />
    </div>
  );
}
