import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

type ReportFormat = "json" | "markdown" | "html" | "csv" | "pdf";

interface ReportRecord {
  id: string;
  title: string;
  source: string;
  target?: string;
  scanId?: string;
  scannerReportId?: string;
  generatedAt: string;
  overallRiskLevel: string;
  riskScore?: number;
  findingCount: number;
  hostCount?: number;
  openPortCount?: number;
  summary?: string;
  availableFormats: string[];
  reportData?: any;
  createdAt: string;
  updatedAt: string;
}

interface ReportAILibraryProps {
  onBack: () => void;
}

const riskClasses: Record<string, string> = {
  Critical: "border-red-500/40 bg-red-500/10 text-red-300",
  High: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  Medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Secure: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  Unknown: "border-slate-600 bg-slate-800/50 text-slate-300",
};

const formatLabel: Record<ReportFormat, string> = {
  json: "JSON",
  markdown: "Markdown",
  html: "HTML",
  csv: "CSV",
  pdf: "PDF",
};

const formatIcon: Record<ReportFormat, React.ReactNode> = {
  json: <FileJson size={13} />,
  markdown: <FileText size={13} />,
  html: <FileCode2 size={13} />,
  csv: <FileSpreadsheet size={13} />,
  pdf: <FileText size={13} />,
};

export const ReportAILibrary: React.FC<ReportAILibraryProps> = ({ onBack }) => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/report-ai/reports", {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ||
            `Report library request failed (${response.status})`
        );
      }

      const data = await response.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load the Report AI library."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          reports.map((report) => report.source)
        )
      ).sort(),
    [reports]
  );

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          report.id,
          report.title,
          report.source,
          report.target,
          report.scanId,
          report.scannerReportId,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(normalizedQuery)
          );

      const matchesRisk =
        riskFilter === "All" ||
        report.overallRiskLevel === riskFilter;

      const matchesSource =
        sourceFilter === "All" ||
        report.source === sourceFilter;

      return (
        matchesQuery &&
        matchesRisk &&
        matchesSource
      );
    });
  }, [
    reports,
    query,
    riskFilter,
    sourceFilter,
  ]);

  const downloadReport = async (
    report: ReportRecord,
    format: ReportFormat
  ) => {
    const key = `${report.id}:${format}`;
    setDownloading(key);

    try {
      const response = await fetch(
        `/api/report-ai/reports/${encodeURIComponent(
          report.id
        )}/download/${format}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data =
          await response.json().catch(() => null);

        throw new Error(
          data?.error ||
            `Download failed (${response.status})`
        );
      }

      const blob = await response.blob();

      const disposition =
        response.headers.get(
          "Content-Disposition"
        ) || "";

      const filenameMatch =
        disposition.match(
          /filename="([^"]+)"/
        );

      const filename =
        filenameMatch?.[1] ||
        `CyberLab_Report_${report.id}.${
          format === "markdown"
            ? "md"
            : format
        }`;

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      window.alert(
        err?.message ||
          "Unable to download report."
      );
    } finally {
      setDownloading(null);
    }
  };

  const detailFindings =
    Array.isArray(
      selectedReport?.reportData?.findings
    )
      ? selectedReport?.reportData?.findings
      : [];

  return (
    <div className="space-y-5">

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 shadow-2xl">

        <div className="border-b border-slate-800 bg-slate-900/70 px-5 py-4">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldAlert size={17} />

                <span className="text-[10px] font-black uppercase tracking-[0.28em]">
                  Report AI Library
                </span>
              </div>

              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-100">
                Centralized Security Report Management
              </h2>

              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                Normalized CyberLab reports • searchable artifacts • download-ready exports
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-slate-500 hover:text-white"
              >
                <ArrowLeft size={14} />
                Executive Reports
              </button>

              <button
                type="button"
                onClick={() => void loadReports()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[1fr_170px_170px]">

          <label className="relative block">

            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="SEARCH ID, TITLE, TARGET, SCAN..."
              className="w-full rounded border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-[10px] uppercase tracking-wider text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-500/50"
            />

          </label>

          <select
            value={riskFilter}
            onChange={(event) =>
              setRiskFilter(event.target.value)
            }
            className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 outline-none"
          >
            <option value="All">
              All Risk Levels
            </option>
            <option value="Critical">
              Critical
            </option>
            <option value="High">
              High
            </option>
            <option value="Medium">
              Medium
            </option>
            <option value="Low">
              Low
            </option>
            <option value="Secure">
              Secure
            </option>
            <option value="Unknown">
              Unknown
            </option>
          </select>

          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value)
            }
            className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 outline-none"
          >
            <option value="All">
              All Sources
            </option>

            {sources.map((source) => (
              <option
                key={source}
                value={source}
              >
                {source}
              </option>
            ))}
          </select>

        </div>

        {error && (
          <div className="m-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] uppercase tracking-wider text-red-300">
            {error}
          </div>
        )}

        <div className="p-4">

          {loading ? (
            <div className="flex min-h-52 items-center justify-center text-[10px] uppercase tracking-[0.25em] text-slate-600">
              <RefreshCw
                size={15}
                className="mr-3 animate-spin"
              />
              Loading Report AI Registry
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded border border-dashed border-slate-800 text-center">

              <FileText
                size={28}
                className="mb-3 text-slate-700"
              />

              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                No matching reports
              </p>

              <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-700">
                Generate an Executive Report to populate the registry.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-800">

              <table className="w-full min-w-[900px] text-left">

                <thead className="bg-slate-900/90">

                  <tr className="text-[9px] uppercase tracking-[0.18em] text-slate-500">

                    <th className="px-4 py-3">
                      Report
                    </th>

                    <th className="px-4 py-3">
                      Source
                    </th>

                    <th className="px-4 py-3">
                      Risk
                    </th>

                    <th className="px-4 py-3">
                      Findings
                    </th>

                    <th className="px-4 py-3">
                      Generated
                    </th>

                    <th className="px-4 py-3 text-right">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-800">

                  {filteredReports.map(
                    (report) => (
                      <tr
                        key={report.id}
                        className="bg-slate-950/40 hover:bg-slate-900/50"
                      >

                        <td className="px-4 py-3">

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReport(
                                report
                              )
                            }
                            className="max-w-[360px] text-left"
                          >

                            <div className="truncate text-[11px] font-bold text-slate-200 hover:text-emerald-300">
                              {report.title}
                            </div>

                            <div className="mt-1 font-mono text-[9px] text-slate-600">
                              {report.id}
                            </div>

                          </button>

                        </td>

                        <td className="px-4 py-3 text-[10px] uppercase text-slate-400">
                          {report.source}
                        </td>

                        <td className="px-4 py-3">

                          <span
                            className={`inline-flex rounded border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                              riskClasses[
                                report.overallRiskLevel
                              ] ||
                              riskClasses.Unknown
                            }`}
                          >
                            {report.overallRiskLevel}
                          </span>

                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                          {report.findingCount}
                        </td>

                        <td className="px-4 py-3 text-[10px] text-slate-500">
                          {new Date(
                            report.generatedAt
                          ).toLocaleString()}
                        </td>

                        <td className="px-4 py-3">

                          <div className="flex justify-end gap-1.5">

                            {(report.availableFormats || [])
                              .filter(
                                (
                                  format
                                ): format is ReportFormat =>
                                  [
                                    "json",
                                    "markdown",
                                    "html",
                                    "csv",
                                  ].includes(
                                    format
                                  )
                              )
                              .map(
                                (format) => (
                                  <button
                                    key={format}
                                    type="button"
                                    title={`Download ${formatLabel[format]}`}
                                    onClick={() =>
                                      void downloadReport(
                                        report,
                                        format
                                      )
                                    }
                                    disabled={
                                      downloading ===
                                      `${report.id}:${format}`
                                    }
                                    className="inline-flex h-7 items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 text-[9px] font-bold uppercase text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
                                  >

                                    {downloading ===
                                    `${report.id}:${format}` ? (
                                      <RefreshCw
                                        size={12}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      formatIcon[
                                        format
                                      ]
                                    )}

                                    {
                                      formatLabel[
                                        format
                                      ]
                                    }

                                  </button>
                                )
                              )}

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        <div className="border-t border-slate-800 px-4 py-3 text-[9px] uppercase tracking-wider text-slate-600">
          Showing {filteredReports.length} of{" "}
          {reports.length} registered report
          {reports.length === 1 ? "" : "s"}
        </div>

      </section>

      {selectedReport && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">

            <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-4">

              <div className="min-w-0 pr-4">

                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">
                  Report AI Detail
                </div>

                <h3 className="mt-1 truncate text-lg font-black text-slate-100">
                  {selectedReport.title}
                </h3>

                <div className="mt-1 font-mono text-[9px] text-slate-600">
                  {selectedReport.id}
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReport(null)
                }
                className="rounded p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
                aria-label="Close report details"
              >
                <X size={18} />
              </button>

            </div>

            <div className="overflow-y-auto p-5">

              <div className="grid gap-3 md:grid-cols-4">

                <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">
                    Risk
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-200">
                    {selectedReport.overallRiskLevel}
                  </div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">
                    Risk Score
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-200">
                    {selectedReport.riskScore ?? "—"}
                  </div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">
                    Findings
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-200">
                    {selectedReport.findingCount}
                  </div>
                </div>

                <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">
                    Hosts
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-200">
                    {selectedReport.hostCount ?? "—"}
                  </div>
                </div>

              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">

                <div className="rounded border border-slate-800 bg-slate-900/40 p-4">

                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Metadata
                  </div>

                  <dl className="mt-3 space-y-2 text-[10px]">

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        Source
                      </dt>
                      <dd className="text-slate-300">
                        {selectedReport.source}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        Target
                      </dt>
                      <dd className="text-right text-slate-300">
                        {selectedReport.target || "—"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        Scan ID
                      </dt>
                      <dd className="font-mono text-right text-slate-300">
                        {selectedReport.scanId || "—"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        Scanner Report
                      </dt>
                      <dd className="font-mono text-right text-slate-300">
                        {selectedReport.scannerReportId || "—"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">
                        Open Ports
                      </dt>
                      <dd className="text-slate-300">
                        {selectedReport.openPortCount ?? "—"}
                      </dd>
                    </div>

                  </dl>

                </div>

                <div className="rounded border border-slate-800 bg-slate-900/40 p-4">

                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Executive Summary
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-[10px] leading-5 text-slate-400">
                    {selectedReport.summary ||
                      "No executive summary was stored with this report."}
                  </p>

                </div>

              </div>

              <div className="mt-4 rounded border border-slate-800 bg-slate-900/40 p-4">

                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Findings
                </div>

                {detailFindings.length === 0 ? (
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-600">
                    No structured findings stored in this report.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">

                    {detailFindings.map(
                      (
                        finding: any,
                        index: number
                      ) => (
                        <div
                          key={`${selectedReport.id}-finding-${index}`}
                          className="rounded border border-slate-800 bg-slate-950/60 p-3"
                        >

                          <div className="flex flex-wrap items-center justify-between gap-2">

                            <div className="text-[11px] font-bold text-slate-200">
                              {finding.title ||
                                finding.name ||
                                `Finding ${index + 1}`}
                            </div>

                            <span className="rounded border border-slate-700 px-2 py-1 text-[8px] font-bold uppercase text-slate-400">
                              {finding.severity ||
                                "Unknown"}
                            </span>

                          </div>

                          <div className="mt-2 grid gap-1 text-[9px] text-slate-500 md:grid-cols-3">

                            <span>
                              Target:{" "}
                              {finding.host ||
                                finding.target ||
                                "—"}
                            </span>

                            <span>
                              CVSS:{" "}
                              {finding.cvss ??
                                finding.cvssScore ??
                                "—"}
                            </span>

                            <span>
                              Port:{" "}
                              {finding.port ??
                                "—"}
                            </span>

                          </div>

                          {(finding.description ||
                            finding.remediation) && (
                            <p className="mt-2 text-[9px] leading-4 text-slate-600">
                              {finding.description ||
                                finding.remediation}
                            </p>
                          )}

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 bg-slate-900/60 px-5 py-4">

              {(selectedReport.availableFormats || [])
                .filter(
                  (
                    format
                  ): format is ReportFormat =>
                    [
                      "json",
                      "markdown",
                      "html",
                      "csv",
                      "pdf",
                    ].includes(format)
                )
                .map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() =>
                      void downloadReport(
                        selectedReport,
                        format
                      )
                    }
                    disabled={
                      downloading ===
                      `${selectedReport.id}:${format}`
                    }
                    className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
                  >
                    <Download size={13} />
                    Download{" "}
                    {formatLabel[format]}
                  </button>
                ))}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
