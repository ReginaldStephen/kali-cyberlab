import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  ExternalLink,
  Globe,
  Layers3,
  Loader2,
  Network,
  RefreshCw,
  Server,
  Trash2,
  Zap,
} from "lucide-react";

interface HttpxDashboardProps {
  onBack: () => void;
}

interface HttpxTlsInfo {
  host?: string | null;
  port?: number | string | null;
  probeStatus?: boolean | null;
  tlsVersion?: string | null;
  cipher?: string | null;
  notBefore?: string | null;
  notAfter?: string | null;
  subjectDn?: string | null;
  subjectCn?: string | null;
  subjectAn?: string[];
  serial?: string | null;
  issuerDn?: string | null;
  issuerCn?: string | null;
  issuerOrg?: string[];
  fingerprintMd5?: string | null;
  fingerprintSha1?: string | null;
  fingerprintSha256?: string | null;
  wildcardCertificate?: boolean | null;
  tlsConnection?: string | null;
  sni?: string | null;
}

type HttpxInspection =
  | "standard"
  | "headers"
  | "body"
  | "full"
  | "base64";

interface HttpxResult {
  id: string;
  target: string;
  timestamp: string;
  url: string;
  input: string;
  finalUrl: string | null;

  statusCode: number | null;
  contentLength: number | null;
  contentType: string | null;
  title: string | null;
  webServer: string | null;
  method: string | null;
  technologies: string[];
  cpe: Array<Record<string, unknown>>;
  responseTime: string | null;

  ip: string | null;
  ipv4: string[];
  ipv6: string[];
  cname: string | null;
  cdn: string | null;

  probe: boolean | null;
  location: string | null;

  redirectChain: unknown[];
  responseHeaders: Record<string, string>;
  rawResponseHeaders: string | null;
  request: string | null;
  body: string | null;
  bodyPreview: string | null;
  responseEncoding: "plain" | "base64" | null;
  wordCount: number | null;
  lineCount: number | null;

  faviconHash: string | null;
  faviconMd5: string | null;
  faviconPath: string | null;
  faviconUrl: string | null;

  jarmHash: string | null;
  http2: boolean | null;
  websocket: boolean | null;

  tls: HttpxTlsInfo | null;

  raw: Record<string, unknown>;
}

interface HttpxCapabilityPayload {
  binary?: string;
  installed?: boolean;
  version?: string | null;
  probes?: string[];
  outputFormats?: string[];
  supports?: Record<string, boolean>;
}

interface HttpxStatusResponse {
  status?: string;
  installed?: boolean;
  binary?: string;
  version?: string | null;
  message?: string;
  timestamp?: string;
  error?: string;
}

interface HttpxCapabilitiesResponse {
  success?: boolean;
  status?: string;
  capabilities?: HttpxCapabilityPayload;
  timestamp?: string;
  error?: string;
}

interface HttpxResultsResponse {
  success?: boolean;
  results?: HttpxResult[];
  count?: number;
  error?: string;
}

interface HttpxProbeResponse {
  success?: boolean;
  status?: string;
  target?: string;
  results?: HttpxResult[];
  count?: number;
  error?: string;
}

const cardClass =
  "rounded-xl border border-slate-800 bg-slate-950/70 shadow-lg shadow-black/20";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40";

function formatDate(value: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatBytes(value: number | null) {
  if (value === null || value === undefined) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function statusClass(statusCode: number | null) {
  if (statusCode === null) return "text-slate-400";
  if (statusCode >= 200 && statusCode < 300) return "text-emerald-400";
  if (statusCode >= 300 && statusCode < 400) return "text-amber-400";
  if (statusCode >= 400) return "text-rose-400";
  return "text-slate-300";
}

export const HttpxDashboard: React.FC<HttpxDashboardProps> = ({
  onBack,
}) => {
  const [status, setStatus] = useState<HttpxStatusResponse | null>(null);
  const [capabilities, setCapabilities] =
    useState<HttpxCapabilitiesResponse | null>(null);

  const [results, setResults] = useState<HttpxResult[]>([]);
  const [target, setTarget] = useState("");
  const [batchTargets, setBatchTargets] = useState("");

  const [timeoutSeconds, setTimeoutSeconds] = useState(10);
  const [followRedirects, setFollowRedirects] = useState(false);
  const [techDetect, setTechDetect] = useState(true);
  const [inspection, setInspection] =
    useState<HttpxInspection>("standard");

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [probing, setProbing] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [probeMessage, setProbeMessage] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);

      const [statusResponse, capabilitiesResponse] =
        await Promise.all([
          fetch("/api/integrations/httpx/status", {
            credentials: "include",
          }),
          fetch("/api/integrations/httpx/capabilities", {
            credentials: "include",
          }),
        ]);

      const statusData =
        (await statusResponse.json()) as HttpxStatusResponse;

      const capabilitiesData =
        (await capabilitiesResponse.json()) as HttpxCapabilitiesResponse;

      if (!statusResponse.ok) {
        throw new Error(
          statusData.error || `HTTPX status request failed: ${statusResponse.status}`
        );
      }

      if (!capabilitiesResponse.ok || capabilitiesData.success === false) {
        throw new Error(
          capabilitiesData.error ||
            `HTTPX capability request failed: ${capabilitiesResponse.status}`
        );
      }

      setStatus(statusData);
      setCapabilities(capabilitiesData);
    } catch (err: any) {
      setError(err?.message || "Unable to load HTTPX status.");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoadingResults(true);

      const response = await fetch(
        "/api/integrations/httpx/results?limit=100",
        {
          credentials: "include",
        }
      );

      const data = (await response.json()) as HttpxResultsResponse;

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error || `HTTPX results request failed: ${response.status}`
        );
      }

      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load HTTPX results.");
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadResults();
  }, [loadStatus, loadResults]);

  const runProbe = async () => {
    const normalizedTarget = target.trim();

    if (!normalizedTarget) {
      setError("Enter a target URL.");
      return;
    }

    try {
      setError(null);
      setProbeMessage(null);
      setProbing(true);

      const response = await fetch("/api/integrations/httpx/probe", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: normalizedTarget,
          timeoutSeconds,
          followRedirects,
          techDetect,
          inspection,
        }),
      });

      const data = (await response.json()) as HttpxProbeResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "HTTPX probe failed.");
      }

      const newResults = Array.isArray(data.results) ? data.results : [];

      setProbeMessage(
        `Probe completed — ${newResults.length} result${
          newResults.length === 1 ? "" : "s"
        } returned.`
      );

      setResults((current) => {
        const merged = [...newResults, ...current];
        const seen = new Set<string>();

        return merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).slice(0, 100);
      });
    } catch (err: any) {
      setError(err?.message || "HTTPX probe failed.");
    } finally {
      setProbing(false);
    }
  };

  const runBatch = async () => {
    const targets = batchTargets
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!targets.length) {
      setError("Enter at least one batch target.");
      return;
    }

    if (targets.length > 50) {
      setError("HTTPX batch probing accepts a maximum of 50 targets.");
      return;
    }

    try {
      setError(null);
      setProbeMessage(null);
      setBatchRunning(true);

      const response = await fetch("/api/integrations/httpx/batch", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targets,
          timeoutSeconds,
          followRedirects,
          techDetect,
          inspection,
        }),
      });

      const data = (await response.json()) as HttpxProbeResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "HTTPX batch probe failed.");
      }

      const newResults = Array.isArray(data.results) ? data.results : [];

      setProbeMessage(
        `Batch completed — ${targets.length} target${
          targets.length === 1 ? "" : "s"
        }, ${newResults.length} result${
          newResults.length === 1 ? "" : "s"
        } returned.`
      );

      setResults((current) => {
        const merged = [...newResults, ...current];
        const seen = new Set<string>();

        return merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).slice(0, 100);
      });
    } catch (err: any) {
      setError(err?.message || "HTTPX batch probe failed.");
    } finally {
      setBatchRunning(false);
    }
  };

  const clearResults = async () => {
    if (!results.length) return;

    try {
      setClearing(true);
      setError(null);

      const response = await fetch(
        "/api/integrations/httpx/results",
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = (await response.json()) as HttpxResultsResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Unable to clear HTTPX results.");
      }

      setResults([]);
      setExpandedResult(null);
    } catch (err: any) {
      setError(err?.message || "Unable to clear HTTPX results.");
    } finally {
      setClearing(false);
    }
  };

  const version = status?.version || "Unknown";

  const executable =
    status?.binary || "/usr/bin/httpx-toolkit";

  const online =
    !loadingStatus &&
    status?.installed === true &&
    status?.status === "online";

  const capabilityCount = useMemo(
    () => capabilities?.capabilities?.probes?.length ?? 0,
    [capabilities]
  );

  return (
    <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <Zap className="h-6 w-6 text-cyan-400" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-wide">
                  HTTPX
                </h1>
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  ProjectDiscovery
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    online
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-700 bg-slate-900 text-slate-400"
                  }`}
                >
                  {loadingStatus
                    ? "CHECKING"
                    : online
                      ? "ONLINE"
                      : "OFFLINE"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                HTTP probing, technology detection and web-service
                reconnaissance through the ProjectDiscovery httpx engine.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void loadStatus();
                void loadResults();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
            >
              <ExternalLink className="h-3.5 w-3.5 rotate-180" />
              Arsenal
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {probeMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <div>{probeMessage}</div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={cardClass + " p-4"}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Engine
              </span>
              <Zap className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-slate-100">
              {version}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {executable}
            </div>
          </div>

          <div className={cardClass + " p-4"}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Results
              </span>
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-slate-100">
              {results.length}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Persisted HTTPX observations
            </div>
          </div>

          <div className={cardClass + " p-4"}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Capabilities
              </span>
              <Layers3 className="h-4 w-4 text-violet-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-slate-100">
              {capabilityCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Advertised probes
            </div>
          </div>

          <div className={cardClass + " p-4"}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Last Refresh
              </span>
              <Clock3 className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-sm font-bold text-slate-200">
              {loadingStatus ? "Checking..." : "Current"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Live integration state
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className={cardClass + " p-5"}>
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Single Target Probe
                </h2>
                <p className="text-xs text-slate-500">
                  Execute a controlled HTTPX probe through CyberLab.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Target URL
                </label>
                <input
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !probing) {
                      void runProbe();
                    }
                  }}
                  placeholder="https://example.com"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Timeout
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={timeoutSeconds}
                    onChange={(event) =>
                      setTimeoutSeconds(
                        Math.max(
                          1,
                          Math.min(120, Number(event.target.value) || 1)
                        )
                      )
                    }
                    className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <input
                    type="checkbox"
                    checked={techDetect}
                    onChange={(event) =>
                      setTechDetect(event.target.checked)
                    }
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Technology
                    </span>
                    <span className="text-xs text-slate-300">
                      Detect technologies
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <input
                    type="checkbox"
                    checked={followRedirects}
                    onChange={(event) =>
                      setFollowRedirects(event.target.checked)
                    }
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Redirects
                    </span>
                    <span className="text-xs text-slate-300">
                      Follow redirects
                    </span>
                  </span>
                </label>

                <label className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    HTTP Inspection
                  </span>
                  <select
                    value={inspection}
                    onChange={(event) =>
                      setInspection(
                        event.target.value as HttpxInspection
                      )
                    }
                    className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
                  >
                    <option value="standard">
                      Standard
                    </option>
                    <option value="headers">
                      Headers
                    </option>
                    <option value="body">
                      Body Preview
                    </option>
                    <option value="full">
                      Full Request/Response
                    </option>
                    <option value="base64">
                      Base64 Request/Response
                    </option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                  Inspection Mode
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {inspection === "standard"
                    ? "Standard HTTPX metadata only."
                    : inspection === "headers"
                      ? "Capture the HTTP response headers."
                      : inspection === "body"
                        ? "Capture a 100-byte response body preview."
                        : inspection === "full"
                          ? "Capture the full HTTP request and response."
                          : "Capture the HTTP request and response in Base64."}
                </div>
              </div>

              <button
                type="button"
                disabled={probing || !online}
                onClick={() => void runProbe()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {probing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                {probing ? "Running HTTPX..." : "Probe Target"}
              </button>
            </div>
          </section>

          <section className={cardClass + " p-5"}>
            <div className="mb-4 flex items-center gap-2">
              <Network className="h-4 w-4 text-violet-400" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Batch Probe
                </h2>
                <p className="text-xs text-slate-500">
                  One target per line. Maximum 50 targets.
                </p>
              </div>
            </div>

            <textarea
              value={batchTargets}
              onChange={(event) => setBatchTargets(event.target.value)}
              placeholder={
                "https://example.com\nhttps://example.org\nhttp://127.0.0.1:3000"
              }
              rows={8}
              className={inputClass + " resize-y font-mono text-xs"}
            />

            <button
              type="button"
              disabled={batchRunning || !online}
              onClick={() => void runBatch()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Layers3 className="h-4 w-4" />
              )}
              {batchRunning ? "Running Batch..." : "Run Batch Probe"}
            </button>
          </section>
        </div>

        <section className={cardClass}>
          <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                HTTPX Result History
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Persisted observations from CyberLab HTTPX probes.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadResults()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
              </button>

              <button
                type="button"
                disabled={clearing || !results.length}
                onClick={() => void clearResults()}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {clearing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Clear
              </button>
            </div>
          </div>

          {loadingResults ? (
            <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading HTTPX results...
            </div>
          ) : !results.length ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No HTTPX results have been recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {results.map((result) => {
                const expanded = expandedResult === result.id;

                return (
                  <div key={result.id} className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedResult(
                          expanded ? null : result.id
                        )
                      }
                      className="w-full text-left"
                    >
                      <div className="grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.8fr_0.9fr_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-200">
                            {result.url || result.input || result.target}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {result.title || "No page title"} ·{" "}
                            {result.webServer || "Server unknown"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                            Status
                          </div>
                          <div
                            className={`mt-1 text-sm font-bold ${statusClass(
                              result.statusCode
                            )}`}
                          >
                            {result.statusCode ?? "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                            Response
                          </div>
                          <div className="mt-1 text-xs text-slate-300">
                            {result.responseTime || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                            IP
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-300">
                            {result.ip || "—"}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          {expanded ? (
                            <ChevronUp className="h-4 w-4 text-cyan-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="mt-4 border-t border-slate-800 pt-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Final URL
                            </div>
                            <div className="mt-1 break-all text-xs text-slate-300">
                              {result.finalUrl || result.url || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Method
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.method || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Content Type
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.contentType || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Content Length
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {formatBytes(result.contentLength)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              CNAME
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.cname || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              CDN
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.cdn || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              IPv4
                            </div>
                            <div className="mt-1 break-all text-xs text-slate-300">
                              {result.ipv4?.length
                                ? result.ipv4.join(", ")
                                : result.ip || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              IPv6
                            </div>
                            <div className="mt-1 break-all text-xs text-slate-300">
                              {result.ipv6?.length
                                ? result.ipv6.join(", ")
                                : "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Response
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.responseTime || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Words / Lines
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {displayValue(result.wordCount)} /{" "}
                              {displayValue(result.lineCount)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              HTTP/2
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {displayValue(result.http2)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              WebSocket
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {displayValue(result.websocket)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Favicon MMH3
                            </div>
                            <div className="mt-1 break-all font-mono text-[10px] text-slate-300">
                              {result.faviconHash || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Favicon MD5
                            </div>
                            <div className="mt-1 break-all font-mono text-[10px] text-slate-300">
                              {result.faviconMd5 || "—"}
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              JARM
                            </div>
                            <div className="mt-1 break-all font-mono text-[10px] text-slate-300">
                              {result.jarmHash || "—"}
                            </div>
                          </div>

                          <div className="md:col-span-2 xl:col-span-4">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Technologies
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {result.technologies?.length ? (
                                result.technologies.map((technology) => (
                                  <span
                                    key={technology}
                                    className="rounded border border-cyan-500/20 bg-cyan-500/5 px-1.5 py-0.5 text-[10px] text-cyan-300"
                                  >
                                    {technology}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500">
                                  None detected
                                </span>
                              )}
                            </div>
                          </div>

                          {result.cpe?.length > 0 && (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                CPE Fingerprints
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {result.cpe.map((entry, index) => (
                                  <span
                                    key={`${String(entry.cpe || entry.product || "cpe")}-${index}`}
                                    className="rounded border border-violet-500/20 bg-violet-500/5 px-1.5 py-0.5 font-mono text-[10px] text-violet-300"
                                  >
                                    {String(
                                      entry.cpe ||
                                      `${entry.vendor || ""}:${entry.product || ""}`
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.redirectChain?.length > 0 && (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                Redirect Chain
                              </div>
                              <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[10px] leading-relaxed text-slate-400">
                                {JSON.stringify(result.redirectChain, null, 2)}
                              </pre>
                            </div>
                          )}

                          {result.tls && (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                TLS Intelligence
                              </div>

                              <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                                    Version
                                  </div>
                                  <div className="mt-1 text-xs text-slate-300">
                                    {result.tls.tlsVersion || "—"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                                    Cipher
                                  </div>
                                  <div className="mt-1 break-all text-xs text-slate-300">
                                    {result.tls.cipher || "—"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                                    Subject
                                  </div>
                                  <div className="mt-1 break-all text-xs text-slate-300">
                                    {result.tls.subjectCn ||
                                      result.tls.subjectDn ||
                                      "—"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                                    Issuer
                                  </div>
                                  <div className="mt-1 break-all text-xs text-slate-300">
                                    {result.tls.issuerCn ||
                                      result.tls.issuerDn ||
                                      "—"}
                                  </div>
                                </div>

                                <div className="md:col-span-2">
                                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                                    Validity
                                  </div>
                                  <div className="mt-1 text-xs text-slate-300">
                                    {result.tls.notBefore || "—"} →{" "}
                                    {result.tls.notAfter || "—"}
                                  </div>
                                </div>

                                <div className="md:col-span-2">
                                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                                    SHA-256
                                  </div>
                                  <div className="mt-1 break-all font-mono text-[10px] text-slate-300">
                                    {result.tls.fingerprintSha256 || "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {result.responseHeaders &&
                            Object.keys(result.responseHeaders).length > 0 && (
                              <div className="md:col-span-2 xl:col-span-4">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                  Response Headers
                                </div>
                                <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[10px] leading-relaxed text-slate-400">
                                  {JSON.stringify(
                                    result.responseHeaders,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}

                          {(result.bodyPreview || result.body) && (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                  {result.bodyPreview
                                    ? "Body Preview"
                                    : result.responseEncoding === "base64"
                                      ? "Response Body · Base64"
                                      : "Response Body"}
                                </div>

                                {result.responseEncoding === "base64" && (
                                  <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-400">
                                    BASE64
                                  </span>
                                )}
                              </div>

                              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[10px] leading-relaxed text-slate-400">
                                {result.bodyPreview || result.body}
                              </pre>
                            </div>
                          )}

                          {result.request && (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                  HTTP Request
                                </div>

                                {result.responseEncoding === "base64" && (
                                  <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-400">
                                    BASE64
                                  </span>
                                )}
                              </div>

                              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[10px] leading-relaxed text-slate-400">
                                {result.request}
                              </pre>
                            </div>
                          )}

                          {result.rawResponseHeaders && (
                            <div className="md:col-span-2 xl:col-span-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                  Raw Response Headers
                                </div>

                                {result.responseEncoding === "base64" && (
                                  <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-400">
                                    BASE64
                                  </span>
                                )}
                              </div>

                              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[10px] leading-relaxed text-slate-400">
                                {result.rawResponseHeaders}
                              </pre>
                            </div>
                          )}

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Location
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.location || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Probe
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {result.probe === null
                                ? "—"
                                : result.probe
                                  ? "Successful"
                                  : "Failed"}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Timestamp
                            </div>
                            <div className="mt-1 text-xs text-slate-300">
                              {formatDate(result.timestamp)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Target
                            </div>
                            <div className="mt-1 break-all text-xs text-slate-300">
                              {result.target || result.input || "—"}
                            </div>
                          </div>

                          <div className="md:col-span-2 xl:col-span-4">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                              Raw HTTPX Result
                            </div>
                            <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[10px] leading-relaxed text-slate-400">
                              {JSON.stringify(result.raw, null, 2)}
                            </pre>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="flex items-center gap-2 border-t border-slate-800 pt-4 text-[10px] uppercase tracking-wider text-slate-600">
          <Server className="h-3.5 w-3.5" />
          CyberLab HTTPX integration · ProjectDiscovery engine
        </div>
      </div>
    </div>
  );
};
