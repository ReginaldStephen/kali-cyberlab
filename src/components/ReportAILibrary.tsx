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

type ReportWorkspaceTab =
  | "overview"
  | "findings"
  | "analytics"
  | "assets"
  | "engagement"
  | "defectdojo"
  | "exports";

interface CyberLabScanRecord {
  id: string;
  timestamp: string;
  type: string;
  target: string;
  commandExecuted: string;
  durationMs: number;
  status: "success" | "failed" | "running";
  hostsFound: number;
  openPortsTotal: number;
  vulnerabilitiesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  rawTerminalOutput: string;
  results?: {
    hosts?: unknown[];
    webAudit?: unknown;
    systemSnapshot?: Record<string, unknown>;
    vulnerabilities?: unknown[];
  };
}

interface DefectDojoStatus {
  configured: boolean;
  reachable: boolean;
  authenticated: boolean;
  baseUrl?: string;
  message?: string;
  timestamp?: string;
}

interface DefectDojoProduct {
  id: number;
  name: string;
  description?: string;
  findings_count?: number;
  created?: string;
}

interface DefectDojoEngagement {
  id: number;
  name: string;
  status?: string;
  progress?: string;
  active?: boolean;
  product?: number;
  target_start?: string;
  target_end?: string;
}

interface DefectDojoFinding {
  id: number;
  title: string;
  severity?: string;
  active?: boolean;
  verified?: boolean;
  date?: string;
  cvssv3_score?: number | null;
  unique_id_from_tool?: string;
  service?: string;
  description?: string;
  mitigation?: string;
}

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
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<ReportWorkspaceTab>("overview");

  const [workspaceReportId, setWorkspaceReportId] =
    useState<string>("");

  const [defectDojoStatus, setDefectDojoStatus] =
    useState<DefectDojoStatus | null>(null);
  const [defectDojoProducts, setDefectDojoProducts] =
    useState<DefectDojoProduct[]>([]);
  const [defectDojoEngagements, setDefectDojoEngagements] =
    useState<DefectDojoEngagement[]>([]);
  const [defectDojoFindings, setDefectDojoFindings] =
    useState<DefectDojoFinding[]>([]);
  const [defectDojoFindingTotal, setDefectDojoFindingTotal] =
    useState(0);
  const [defectDojoLoading, setDefectDojoLoading] =
    useState(false);
  const [defectDojoError, setDefectDojoError] =
    useState("");
  const [defectDojoSyncing, setDefectDojoSyncing] =
    useState(false);
  const [defectDojoSyncMessage, setDefectDojoSyncMessage] =
    useState("");

  const [defectDojoSyncReportId, setDefectDojoSyncReportId] =
    useState("");

  const [cyberLabScans, setCyberLabScans] =
    useState<CyberLabScanRecord[]>([]);
  const [cyberLabScansLoading, setCyberLabScansLoading] =
    useState(false);
  const [defectDojoSyncScanId, setDefectDojoSyncScanId] =
    useState("");

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

  const loadDefectDojo = async () => {
    setDefectDojoLoading(true);
    setDefectDojoError("");

    try {
      const request = async <T,>(endpoint: string): Promise<T> => {
        const response = await fetch(endpoint, {
          credentials: "include",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `DefectDojo request failed (${response.status})`
          );
        }

        return data as T;
      };

      const [
        statusData,
        productsData,
        engagementsData,
        findingsData,
      ] = await Promise.all([
        request<DefectDojoStatus>(
          "/api/integrations/defectdojo/status"
        ),
        request<{ products?: DefectDojoProduct[] }>(
          "/api/integrations/defectdojo/products"
        ),
        request<{ engagements?: DefectDojoEngagement[] }>(
          "/api/integrations/defectdojo/engagements"
        ),
        request<{
          findings?: DefectDojoFinding[];
          count?: number;
          loadedCount?: number;
        }>(
          "/api/integrations/defectdojo/findings"
        ),
      ]);

      setDefectDojoStatus(statusData);

      setDefectDojoProducts(
        Array.isArray(productsData.products)
          ? productsData.products
          : []
      );

      setDefectDojoEngagements(
        Array.isArray(engagementsData.engagements)
          ? engagementsData.engagements
          : []
      );

      setDefectDojoFindingTotal(
        Number(findingsData.count) || 0
      );

      setDefectDojoFindings(
        Array.isArray(findingsData.findings)
          ? findingsData.findings
          : []
      );
    } catch (err: any) {
      setDefectDojoError(
        err?.message ||
          "Unable to load DefectDojo integration data."
      );
    } finally {
      setDefectDojoLoading(false);
    }
  };


  const loadCyberLabScans = async () => {
    setCyberLabScansLoading(true);

    try {
      const response = await fetch("/api/scan/history", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Unable to load CyberLab scan history (${response.status})`
        );
      }

      const data = await response.json();

      const scans = Array.isArray(data)
        ? data
        : Array.isArray(data?.scans)
          ? data.scans
          : [];

      setCyberLabScans(scans);
    } catch (err: any) {
      setDefectDojoError(
        err?.message ||
          "Unable to load CyberLab scan history."
      );
      setCyberLabScans([]);
    } finally {
      setCyberLabScansLoading(false);
    }
  };

  const syncReportToDefectDojo = async () => {
    const selectedScan = cyberLabScans.find(
      (scan) =>
        scan.id === defectDojoSyncScanId &&
        scan.status === "success"
    );

    if (!selectedScan) {
      setDefectDojoError(
        "Select a successful CyberLab scan before synchronization."
      );
      return;
    }

    setDefectDojoSyncing(true);
    setDefectDojoError("");
    setDefectDojoSyncMessage("");

    try {
      const response = await fetch(
        "/api/integrations/defectdojo/sync",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scanId: selectedScan.id,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `DefectDojo synchronization failed (${response.status})`
        );
      }

      const result = data?.defectDojo;

      setDefectDojoSyncMessage(
        result?.message ||
          `Synchronization completed for ${selectedScan.id}.`
      );

      await loadDefectDojo();
    } catch (err: any) {
      setDefectDojoError(
        err?.message ||
          "Unable to synchronize the scan with DefectDojo."
      );
    } finally {
      setDefectDojoSyncing(false);
    }
  };

  useEffect(() => {
    if (activeWorkspaceTab === "defectdojo") {
      void loadDefectDojo();
      void loadCyberLabScans();
    }
  }, [activeWorkspaceTab]);

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

  const workspaceReport =
    reports.find(
      (report) => report.id === workspaceReportId
    ) || reports[0] || null;

  const workspaceFindings =
    Array.isArray(
      workspaceReport?.reportData?.findings
    )
      ? workspaceReport.reportData.findings
      : [];

  const workspaceSeverityCounts =
    workspaceFindings.reduce(
      (counts, finding: any) => {
        const severity =
          finding?.severity || "Unknown";

        counts[severity] =
          (counts[severity] || 0) + 1;

        return counts;
      },
      {} as Record<string, number>
    );

  const workspaceReportData =
    (workspaceReport?.reportData || {}) as any;

  const workspaceHosts = Array.isArray(
    workspaceReportData.hosts
  )
    ? workspaceReportData.hosts
    : Array.isArray(workspaceReportData.assets)
      ? workspaceReportData.assets
      : [];

  const workspacePorts = Array.isArray(
    workspaceReportData.ports
  )
    ? workspaceReportData.ports
    : [];

  const workspaceServices = Array.isArray(
    workspaceReportData.services
  )
    ? workspaceReportData.services
    : [];

  const workspaceFindingHosts = Array.from(
    new Set(
      workspaceFindings
        .map(
          (finding: any) =>
            finding?.host ||
            finding?.ip ||
            finding?.address ||
            finding?.target
        )
        .filter(Boolean)
        .map((value: unknown) => String(value))
    )
  );

  const workspaceFindingPorts = Array.from(
    new Set(
      workspaceFindings
        .map(
          (finding: any) =>
            finding?.port ||
            finding?.portNumber ||
            finding?.servicePort
        )
        .filter(Boolean)
        .map((value: unknown) => String(value))
    )
  );

  const workspaceFindingServices = Array.from(
    new Set(
      workspaceFindings
        .map(
          (finding: any) =>
            finding?.service ||
            finding?.serviceName ||
            finding?.detectedVia
        )
        .filter(Boolean)
        .map((value: unknown) => String(value))
    )
  );

  const workspaceOpenFindingCount =
    workspaceFindings.filter(
      (finding: any) =>
        finding?.active !== false &&
        finding?.status !== "Closed" &&
        finding?.status !== "Resolved"
    ).length;

  const workspaceVerifiedFindingCount =
    workspaceFindings.filter(
      (finding: any) => finding?.verified === true
    ).length;

  const workspaceRiskScore =
    workspaceReport?.riskScore ??
    workspaceReportData.riskScore ??
    null;

  const workspaceHostCount =
    workspaceReport?.hostCount ??
    (workspaceHosts.length ||
      workspaceFindingHosts.length ||
      0);

  const workspacePortCount =
    workspaceReport?.openPortCount ??
    (workspacePorts.length ||
      workspaceFindingPorts.length ||
      0);

  const workspaceSource =
    workspaceReport?.source ||
    workspaceReportData.source ||
    "Unknown";

  const workspaceTarget =
    workspaceReport?.target ||
    workspaceReportData.target ||
    "Unknown";

  const detailFindings =
    Array.isArray(
      selectedReport?.reportData?.findings
    )
      ? selectedReport?.reportData?.findings
      : [];

  const defectDojoSeverityCounts = useMemo(() => {
    return defectDojoFindings.reduce(
      (counts, finding) => {
        const severity =
          finding.severity || "Unknown";

        counts[severity] =
          (counts[severity] || 0) + 1;

        return counts;
      },
      {} as Record<string, number>
    );
  }, [defectDojoFindings]);

  const defectDojoActiveFindings =
    defectDojoFindings.filter(
      (finding) => finding.active !== false
    ).length;

  const defectDojoVerifiedFindings =
    defectDojoFindings.filter(
      (finding) => finding.verified === true
    ).length;

  const defectDojoTopProduct =
    [...defectDojoProducts].sort(
      (a, b) =>
        (b.findings_count || 0) -
        (a.findings_count || 0)
    )[0];

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

        <div className="overflow-x-auto border-b border-slate-800 bg-slate-950/80">
          <div className="flex min-w-max px-4">
            {(
              [
                ["overview", "REPORT OVERVIEW"],
                ["findings", "FINDINGS"],
                ["analytics", "ANALYTICS"],
                ["assets", "ASSETS"],
                ["engagement", "ENGAGEMENT"],
                ["defectdojo", "DEFECTDOJO"],
                ["exports", "EXPORTS"],
              ] as Array<[ReportWorkspaceTab, string]>
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveWorkspaceTab(tab)}
                className={`border-b-2 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] transition ${
                  activeWorkspaceTab === tab
                    ? "border-emerald-400 text-emerald-300"
                    : "border-transparent text-slate-600 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                WORKSPACE REPORT
              </div>
              <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-700">
                Select the CyberLab report that powers the workspace analytics.
              </div>
            </div>

            <select
              value={workspaceReportId || workspaceReport?.id || ""}
              onChange={(event) =>
                setWorkspaceReportId(event.target.value)
              }
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-bold text-slate-200 outline-none transition focus:border-cyan-500/50 lg:w-[520px]"
            >
              <option value="">
                {reports.length
                  ? "Select a report"
                  : "No reports available"}
              </option>

              {reports.map((report) => (
                <option
                  key={report.id}
                  value={report.id}
                >
                  {report.title} — {report.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeWorkspaceTab === "defectdojo" && (
          <div className="border-b border-slate-800 bg-slate-950/40 p-4">
            <div className="space-y-4">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <ShieldAlert size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                      DEFECTDOJO OPERATIONS
                    </span>
                  </div>

                  <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-100">
                    CyberLab-Native Vulnerability Management
                  </h3>

                  <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
                    DefectDojo backend intelligence • CyberLab reporting interface
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadDefectDojo()}
                    disabled={defectDojoLoading}
                    className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={13}
                      className={
                        defectDojoLoading
                          ? "animate-spin"
                          : ""
                      }
                    />
                    Refresh DefectDojo
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void syncReportToDefectDojo()
                    }
                    disabled={
                      defectDojoSyncing ||
                      cyberLabScansLoading ||
                      !defectDojoSyncScanId ||
                      !cyberLabScans.some(
                        (scan) =>
                          scan.id === defectDojoSyncScanId &&
                          scan.status === "success"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    <RefreshCw
                      size={13}
                      className={
                        defectDojoSyncing
                          ? "animate-spin"
                          : ""
                      }
                    />
                    {defectDojoSyncing
                      ? "Synchronizing..."
                      : "Sync Current Scan"}
                  </button>
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">

                  <div>
                    <label
                      htmlFor="defectdojo-sync-scan"
                      className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500"
                    >
                      CYBERLAB SOURCE SCAN
                    </label>

                    <select
                      id="defectdojo-sync-scan"
                      value={defectDojoSyncScanId}
                      onChange={(event) =>
                        setDefectDojoSyncScanId(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-bold text-slate-200 outline-none transition focus:border-cyan-500/50"
                    >
                      <option value="">
                        {cyberLabScansLoading
                          ? "Loading CyberLab scans..."
                          : "Select a scan to synchronize"}
                      </option>

                      {cyberLabScans
                        .filter((scan) => scan.status === "success")
                        .map((scan) => {
                          const findingCount =
                            scan.vulnerabilitiesCount.critical +
                            scan.vulnerabilitiesCount.high +
                            scan.vulnerabilitiesCount.medium +
                            scan.vulnerabilitiesCount.low +
                            scan.vulnerabilitiesCount.info;

                          return (
                            <option
                              key={scan.id}
                              value={scan.id}
                            >
                              {scan.type} • {scan.target} • {scan.id} •{" "}
                              {scan.hostsFound} host(s) •{" "}
                              {scan.openPortsTotal} port(s) •{" "}
                              {findingCount} finding(s)
                            </option>
                          );
                        })}
                    </select>

                    <p className="mt-2 text-[8px] uppercase tracking-wider text-slate-700">
                      Successful CyberLab scans can be synchronized directly; an AI report is not required.
                    </p>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 px-4 py-3 lg:min-w-[210px]">
                    <div className="text-[8px] uppercase tracking-wider text-slate-600">
                      Selected Scan
                    </div>

                    <div className="mt-1 truncate font-mono text-[9px] text-cyan-300">
                      {cyberLabScans.find(
                        (scan) =>
                          scan.id ===
                          defectDojoSyncScanId
                      )?.id || "NONE"}
                    </div>

                    <div className="mt-1 truncate text-[8px] text-slate-500">
                      {cyberLabScans.find(
                        (scan) =>
                          scan.id ===
                          defectDojoSyncScanId
                      )?.target || "No target selected"}
                    </div>
                  </div>

                </div>
              </div>

              {defectDojoError && (
                <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-[9px] uppercase tracking-wider text-red-300">
                  {defectDojoError}
                </div>
              )}

              {defectDojoSyncMessage && (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[9px] uppercase tracking-wider text-emerald-300">
                  {defectDojoSyncMessage}
                </div>
              )}

              {defectDojoLoading ? (
                <div className="flex min-h-48 items-center justify-center rounded border border-slate-800 bg-slate-950/60 text-[9px] uppercase tracking-[0.25em] text-slate-600">
                  <RefreshCw
                    size={15}
                    className="mr-3 animate-spin"
                  />
                  Loading DefectDojo Intelligence
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-[8px] uppercase tracking-wider text-slate-600">
                        Connection
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-black uppercase">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            defectDojoStatus?.authenticated &&
                            defectDojoStatus?.reachable
                              ? "bg-emerald-400"
                              : "bg-red-400"
                          }`}
                        />
                        {defectDojoStatus?.authenticated &&
                        defectDojoStatus?.reachable
                          ? "Healthy"
                          : "Unavailable"}
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-[8px] uppercase tracking-wider text-slate-600">
                        Products
                      </div>
                      <div className="mt-2 text-xl font-black text-slate-100">
                        {defectDojoProducts.length}
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-[8px] uppercase tracking-wider text-slate-600">
                        Engagements
                      </div>
                      <div className="mt-2 text-xl font-black text-slate-100">
                        {defectDojoEngagements.length}
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-[8px] uppercase tracking-wider text-slate-600">
                        Findings
                      </div>
                      <div className="mt-2 text-xl font-black text-slate-100">
                        {defectDojoFindingTotal}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-700">
                        {defectDojoFindings.length} loaded
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-[8px] uppercase tracking-wider text-slate-600">
                        Active / Verified
                      </div>
                      <div className="mt-2 text-sm font-black text-slate-100">
                        {defectDojoActiveFindings}
                        <span className="mx-1 text-slate-700">
                          /
                        </span>
                        {defectDojoVerifiedFindings}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-700">
                        Loaded page
                      </div>
                    </div>

                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">

                    <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                        Loaded Page Severity Distribution
                      </div>

                      <div className="mt-3 space-y-2">
                        {[
                          ["Critical", "text-red-300"],
                          ["High", "text-orange-300"],
                          ["Medium", "text-amber-300"],
                          ["Low", "text-emerald-300"],
                          ["Info", "text-cyan-300"],
                          ["Unknown", "text-slate-400"],
                        ].map(([severity, colorClass]) => (
                          <div
                            key={severity}
                            className="flex items-center justify-between text-[9px]"
                          >
                            <span
                              className={`font-bold uppercase ${colorClass}`}
                            >
                              {severity}
                            </span>
                            <span className="font-mono text-slate-400">
                              {defectDojoSeverityCounts[
                                severity
                              ] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                        Primary Product
                      </div>

                      <div className="mt-3">
                        <div className="text-sm font-black text-slate-200">
                          {defectDojoTopProduct?.name ||
                            "No products found"}
                        </div>

                        <div className="mt-2 text-[9px] uppercase tracking-wider text-slate-600">
                          Findings
                        </div>

                        <div className="mt-1 text-xl font-black text-cyan-300">
                          {defectDojoTopProduct?.findings_count ??
                            0}
                        </div>
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                        API Status
                      </div>

                      <div className="mt-3 space-y-2 text-[9px]">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Configured
                          </span>
                          <span className="font-bold text-slate-300">
                            {defectDojoStatus?.configured
                              ? "YES"
                              : "NO"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Reachable
                          </span>
                          <span className="font-bold text-slate-300">
                            {defectDojoStatus?.reachable
                              ? "YES"
                              : "NO"}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Authenticated
                          </span>
                          <span className="font-bold text-slate-300">
                            {defectDojoStatus?.authenticated
                              ? "YES"
                              : "NO"}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">

                    <div className="rounded border border-slate-800 bg-slate-900/40">
                      <div className="border-b border-slate-800 px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Engagements
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto">
                        {defectDojoEngagements.length === 0 ? (
                          <div className="p-4 text-[9px] uppercase tracking-wider text-slate-600">
                            No DefectDojo engagements found.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-800">
                            {defectDojoEngagements.map(
                              (engagement) => (
                                <div
                                  key={engagement.id}
                                  className="px-4 py-3 hover:bg-slate-900/60"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate text-[10px] font-bold text-slate-200">
                                        {engagement.name}
                                      </div>
                                      <div className="mt-1 font-mono text-[8px] text-slate-600">
                                        ENGAGEMENT #{engagement.id}
                                      </div>
                                    </div>

                                    <span className="shrink-0 rounded border border-slate-700 px-2 py-1 text-[8px] font-bold uppercase text-slate-400">
                                      {engagement.status ||
                                        "Unknown"}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-900/40">
                      <div className="border-b border-slate-800 px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Products
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto">
                        {defectDojoProducts.length === 0 ? (
                          <div className="p-4 text-[9px] uppercase tracking-wider text-slate-600">
                            No DefectDojo products found.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-800">
                            {defectDojoProducts.map(
                              (product) => (
                                <div
                                  key={product.id}
                                  className="px-4 py-3 hover:bg-slate-900/60"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-[10px] font-bold text-slate-200">
                                        {product.name}
                                      </div>
                                      <div className="mt-1 font-mono text-[8px] text-slate-600">
                                        PRODUCT #{product.id}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="text-[8px] uppercase text-slate-600">
                                        Findings
                                      </div>
                                      <div className="font-mono text-[11px] font-bold text-cyan-300">
                                        {product.findings_count ??
                                          0}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  <div className="rounded border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Findings
                        </div>
                        <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-700">
                          DefectDojo vulnerability records
                        </div>
                      </div>

                      <div className="font-mono text-[9px] text-slate-600">
                        {defectDojoFindings.length} RECORDS
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {defectDojoFindings.length === 0 ? (
                        <div className="p-4 text-[9px] uppercase tracking-wider text-slate-600">
                          No DefectDojo findings returned.
                        </div>
                      ) : (
                        <table className="w-full min-w-[850px] text-left">
                          <thead className="bg-slate-950/70">
                            <tr className="text-[8px] uppercase tracking-[0.15em] text-slate-600">
                              <th className="px-4 py-3">
                                Finding
                              </th>
                              <th className="px-4 py-3">
                                Severity
                              </th>
                              <th className="px-4 py-3">
                                Status
                              </th>
                              <th className="px-4 py-3">
                                CVSS
                              </th>
                              <th className="px-4 py-3">
                                Service
                              </th>
                              <th className="px-4 py-3">
                                ID
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-800">
                            {defectDojoFindings.map(
                              (finding) => (
                                <tr
                                  key={finding.id}
                                  className="bg-slate-950/30 hover:bg-slate-900/60"
                                >
                                  <td className="max-w-[300px] px-4 py-3">
                                    <div className="truncate text-[10px] font-bold text-slate-200">
                                      {finding.title}
                                    </div>
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex rounded border px-2 py-1 text-[8px] font-black uppercase ${
                                        riskClasses[
                                          finding.severity ||
                                            "Unknown"
                                        ] ||
                                        riskClasses.Unknown
                                      }`}
                                    >
                                      {finding.severity ||
                                        "Unknown"}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-[8px] font-bold uppercase text-slate-400">
                                    {finding.active === false
                                      ? "Inactive"
                                      : finding.verified
                                        ? "Verified"
                                        : "Active"}
                                  </td>

                                  <td className="px-4 py-3 font-mono text-[9px] text-slate-300">
                                    {finding.cvssv3_score ??
                                      "—"}
                                  </td>

                                  <td className="max-w-[220px] truncate px-4 py-3 text-[9px] text-slate-500">
                                    {finding.service ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-3 font-mono text-[8px] text-slate-600">
                                    #{finding.id}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </>
              )}
            </div>
          </div>
        )}

        {(activeWorkspaceTab === "overview" ||
          activeWorkspaceTab === "exports") && (
          <>
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

          </>
        )}

        {activeWorkspaceTab === "findings" && (
          <div className="p-4">
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                  Total Findings
                </div>
                <div className="mt-2 text-2xl font-black text-slate-200">
                  {workspaceFindings.length}
                </div>
              </div>

              <div className="rounded border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-red-400/70">
                  Critical
                </div>
                <div className="mt-2 text-2xl font-black text-red-300">
                  {workspaceSeverityCounts.Critical || 0}
                </div>
              </div>

              <div className="rounded border border-orange-500/20 bg-orange-500/5 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-orange-400/70">
                  High
                </div>
                <div className="mt-2 text-2xl font-black text-orange-300">
                  {workspaceSeverityCounts.High || 0}
                </div>
              </div>

              <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-emerald-400/70">
                  Verified
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-300">
                  {workspaceVerifiedFindingCount}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950/30">
              {workspaceFindings.length === 0 ? (
                <div className="flex min-h-52 items-center justify-center text-[9px] uppercase tracking-[0.18em] text-slate-600">
                  No findings available for the selected report.
                </div>
              ) : (
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-900/80">
                    <tr className="text-[8px] uppercase tracking-[0.16em] text-slate-600">
                      <th className="px-4 py-3">Finding</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Host</th>
                      <th className="px-4 py-3">Port</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {workspaceFindings.map(
                      (finding: any, index: number) => {
                        const severity =
                          finding?.severity || "Unknown";

                        const host =
                          finding?.host ||
                          finding?.ip ||
                          finding?.address ||
                          finding?.target ||
                          "—";

                        const port =
                          finding?.port ||
                          finding?.portNumber ||
                          finding?.servicePort ||
                          "—";

                        const service =
                          finding?.service ||
                          finding?.serviceName ||
                          finding?.detectedVia ||
                          "—";

                        const status =
                          finding?.status ||
                          (finding?.active === false
                            ? "Inactive"
                            : finding?.verified
                              ? "Verified"
                              : "Open");

                        return (
                          <tr
                            key={`${workspaceReport?.id}-finding-${index}`}
                            className="bg-slate-950/30 hover:bg-slate-900/60"
                          >
                            <td className="max-w-[360px] px-4 py-3">
                              <div className="truncate text-[10px] font-bold text-slate-200">
                                {finding?.title ||
                                  finding?.name ||
                                  `Finding ${index + 1}`}
                              </div>
                              {finding?.id && (
                                <div className="mt-1 font-mono text-[8px] text-slate-700">
                                  {finding.id}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded border px-2 py-1 text-[8px] font-black uppercase ${
                                  riskClasses[severity] ||
                                  riskClasses.Unknown
                                }`}
                              >
                                {severity}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono text-[9px] text-cyan-300">
                              {host}
                            </td>

                            <td className="px-4 py-3 font-mono text-[9px] text-slate-300">
                              {port}
                            </td>

                            <td className="max-w-[220px] truncate px-4 py-3 text-[9px] text-slate-500">
                              {service}
                            </td>

                            <td className="px-4 py-3 text-[8px] font-bold uppercase text-slate-400">
                              {status}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeWorkspaceTab === "analytics" && (
          <div className="p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                  Risk Level
                </div>
                <div className="mt-2 text-xl font-black text-slate-200">
                  {workspaceReport?.overallRiskLevel || "Unknown"}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                  Risk Score
                </div>
                <div className="mt-2 text-xl font-black text-cyan-300">
                  {workspaceRiskScore ?? "—"}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                  Open Findings
                </div>
                <div className="mt-2 text-xl font-black text-orange-300">
                  {workspaceOpenFindingCount}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                  Verified Findings
                </div>
                <div className="mt-2 text-xl font-black text-emerald-300">
                  {workspaceVerifiedFindingCount}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Severity Distribution
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["Critical", "bg-red-500"],
                    ["High", "bg-orange-500"],
                    ["Medium", "bg-yellow-500"],
                    ["Low", "bg-cyan-500"],
                    ["Info", "bg-slate-500"],
                    ["Unknown", "bg-slate-700"],
                  ].map(([severity, barClass]) => {
                    const count =
                      workspaceSeverityCounts[severity] || 0;

                    const total =
                      workspaceFindings.length || 1;

                    const percentage =
                      Math.round((count / total) * 100);

                    return (
                      <div key={severity}>
                        <div className="flex items-center justify-between text-[8px] uppercase tracking-wider">
                          <span className="text-slate-500">
                            {severity}
                          </span>
                          <span className="font-mono text-slate-400">
                            {count} / {percentage}%
                          </span>
                        </div>

                        <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-900">
                          <div
                            className={`h-full ${barClass}`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Scan Telemetry
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Hosts
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold text-cyan-300">
                      {workspaceHostCount}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Open Ports
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold text-cyan-300">
                      {workspacePortCount}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Findings
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold text-orange-300">
                      {workspaceFindings.length}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Services
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold text-emerald-300">
                      {workspaceServices.length ||
                        workspaceFindingServices.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeWorkspaceTab === "assets" && (
          <div className="p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  Target
                </div>
                <div className="mt-2 truncate font-mono text-sm font-bold text-cyan-300">
                  {workspaceTarget}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  Hosts
                </div>
                <div className="mt-2 text-xl font-black text-slate-200">
                  {workspaceHostCount}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  Open Ports
                </div>
                <div className="mt-2 text-xl font-black text-slate-200">
                  {workspacePortCount}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded border border-slate-800 bg-slate-950/40">
                <div className="border-b border-slate-800 px-4 py-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Hosts / Assets
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-3">
                  {(
                    workspaceHosts.length
                      ? workspaceHosts
                      : workspaceFindingHosts
                  ).length === 0 ? (
                    <div className="p-2 text-[8px] uppercase tracking-wider text-slate-700">
                      No host inventory in report.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(workspaceHosts.length
                        ? workspaceHosts
                        : workspaceFindingHosts
                      ).map(
                        (host: any, index: number) => {
                          const label =
                            typeof host === "string"
                              ? host
                              : host?.ip ||
                                host?.address ||
                                host?.host ||
                                host?.name ||
                                `Asset ${index + 1}`;

                          return (
                            <div
                              key={`${label}-${index}`}
                              className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-[9px] text-cyan-300"
                            >
                              {label}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/40">
                <div className="border-b border-slate-800 px-4 py-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Ports
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-3">
                  {(workspacePorts.length
                    ? workspacePorts
                    : workspaceFindingPorts
                  ).length === 0 ? (
                    <div className="p-2 text-[8px] uppercase tracking-wider text-slate-700">
                      No port inventory in report.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(workspacePorts.length
                        ? workspacePorts
                        : workspaceFindingPorts
                      ).map(
                        (port: any, index: number) => {
                          const label =
                            typeof port === "string" ||
                            typeof port === "number"
                              ? String(port)
                              : `${port?.port || port?.number || "?"}${port?.protocol ? `/${port.protocol}` : ""}`;

                          const service =
                            typeof port === "object"
                              ? port?.service ||
                                port?.name
                              : "";

                          return (
                            <div
                              key={`${label}-${index}`}
                              className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-950/60 px-3 py-2"
                            >
                              <span className="font-mono text-[9px] text-cyan-300">
                                {label}
                              </span>
                              <span className="truncate text-[8px] uppercase text-slate-600">
                                {service || "OPEN"}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/40">
                <div className="border-b border-slate-800 px-4 py-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Services
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-3">
                  {(workspaceServices.length
                    ? workspaceServices
                    : workspaceFindingServices
                  ).length === 0 ? (
                    <div className="p-2 text-[8px] uppercase tracking-wider text-slate-700">
                      No service inventory in report.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(workspaceServices.length
                        ? workspaceServices
                        : workspaceFindingServices
                      ).map(
                        (service: any, index: number) => {
                          const label =
                            typeof service === "string"
                              ? service
                              : service?.name ||
                                service?.service ||
                                service?.detectedVia ||
                                `Service ${index + 1}`;

                          return (
                            <div
                              key={`${label}-${index}`}
                              className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-[9px] text-emerald-300"
                            >
                              {label}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeWorkspaceTab === "engagement" && (
          <div className="p-4">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Engagement Scope
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Target
                    </div>
                    <div className="mt-1 break-all font-mono text-[10px] text-cyan-300">
                      {workspaceTarget}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Source
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase text-slate-300">
                      {workspaceSource}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Scan ID
                    </div>
                    <div className="mt-1 break-all font-mono text-[9px] text-slate-300">
                      {workspaceReport?.scanId || "—"}
                    </div>
                  </div>

                  <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[8px] uppercase text-slate-600">
                      Scanner Report
                    </div>
                    <div className="mt-1 break-all font-mono text-[9px] text-slate-300">
                      {workspaceReport?.scannerReportId || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Engagement Status
                </div>

                <div className="mt-4">
                  <div
                    className={`inline-flex rounded border px-3 py-1.5 text-[9px] font-black uppercase ${
                      riskClasses[
                        workspaceReport?.overallRiskLevel ||
                          "Unknown"
                      ] || riskClasses.Unknown
                    }`}
                  >
                    {workspaceReport?.overallRiskLevel ||
                      "Unknown"}
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-[9px]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <span className="uppercase text-slate-600">
                      Generated
                    </span>
                    <span className="font-mono text-slate-300">
                      {workspaceReport?.generatedAt
                        ? new Date(
                            workspaceReport.generatedAt
                          ).toLocaleString()
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <span className="uppercase text-slate-600">
                      Hosts
                    </span>
                    <span className="font-mono text-cyan-300">
                      {workspaceHostCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                    <span className="uppercase text-slate-600">
                      Open Ports
                    </span>
                    <span className="font-mono text-cyan-300">
                      {workspacePortCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase text-slate-600">
                      Findings
                    </span>
                    <span className="font-mono text-orange-300">
                      {workspaceFindings.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
