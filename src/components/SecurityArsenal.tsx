import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ShieldCheck,
  Activity,
  Globe,
  Server,
  Network,
  BarChart3,
  Radar,
  ExternalLink,
  Settings,
  CheckCircle2,
  CircleOff,
  RefreshCw,
  Target,
  List,
  Map,
  ActivitySquare,
} from "lucide-react";

interface SecurityArsenalProps {
  onLaunch: (url: string) => void;
  onOpenObservium: () => void;
  onOpenGreenbone: () => void;
  onOpenTShark: () => void;
  onOpenBurp: () => void;
  onOpenHttpx: () => void;
  onOpenWazuh: () => void;
}

interface IntegrationStatus {
  id: string;
  name: string;
  url: string;
  status: "online" | "offline" | "not-configured";
  responseTimeMs: number | null;
  message: string;
  checkedAt: string;
}

interface IntegrationStatusResponse {
  timestamp: string;
  integrations: IntegrationStatus[];
}

interface BurpListener {
  address: string;
  port: number;
  protocol: "tcp" | "unknown";
  source: string;
}

interface BurpCapability {
  id: string;
  name: string;
  category: string;
  description: string;
  available: boolean;
  edition: "community" | "professional" | "unknown";
  status: "available" | "limited" | "professional" | "not-detected";
}

interface BurpStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  edition: "community" | "professional" | "unknown";
  pid: number | null;
  jarPath: string | null;
  launcherPath: string | null;
  listeners: BurpListener[];
  proxyListener: BurpListener | null;
  launchCommand: string | null;
  message: string;
}

interface BurpStatusResponse {
  success: boolean;
  status: BurpStatus;
  timestamp: string;
}

interface BurpCapabilitiesResponse {
  success: boolean;
  edition: "community" | "professional" | "unknown";
  version: string | null;
  capabilities: BurpCapability[];
  timestamp: string;
}

interface BurpTarget {
  id: string;
  name: string;
  baseUrl: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "unknown";
  inScope: boolean;
  enabled: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface BurpScopeEntry {
  id: string;
  pattern: string;
  include: boolean;
  enabled: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface BurpHttpRecord {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
  requestBytes: number;
  responseBytes: number;
  durationMs: number;
  source: string;
  targetId?: string;
}

interface BurpSiteMapEntry {
  id: string;
  url: string;
  method: string;
  host: string;
  path: string;
  status: number;
  contentType: string;
  responseBytes: number;
  firstSeen: string;
  lastSeen: string;
  source: string;
}

interface BurpTargetsResponse {
  success: boolean;
  targets: BurpTarget[];
  timestamp: string;
}

interface BurpScopeResponse {
  success: boolean;
  scope: BurpScopeEntry[];
  timestamp: string;
}

interface BurpHistoryResponse {
  success: boolean;
  history: BurpHttpRecord[];
  timestamp: string;
}

interface BurpSiteMapResponse {
  success: boolean;
  siteMap: BurpSiteMapEntry[];
  timestamp: string;
}

interface SecurityTool {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
  status: "ready" | "offline" | "external" | "online" | "not-configured";
  icon: React.ElementType;
}

const tools: SecurityTool[] = [
  {
    id: "greenbone",
    name: "Greenbone / OpenVAS",
    category: "VULNERABILITY MANAGEMENT",
    description:
      "Network vulnerability assessment, CVE discovery, risk scoring and vulnerability management.",
    url: "",
    status: "ready",
    icon: ShieldCheck,
  },
  {
    id: "observium",
    name: "Observium",
    category: "NETWORK MONITORING",
    description:
      "Infrastructure monitoring for network devices, interfaces, traffic, sensors and system health.",
    url: "http://127.0.0.1:8081",
    status: "ready",
    icon: Activity,
  },
  {
    id: "tshark",
    name: "TShark Network Analyzer",
    category: "PACKET ANALYSIS",
    description:
      "Live packet capture, protocol analysis, traffic statistics and network visibility powered by TShark.",
    url: "",
    status: "ready",
    icon: Network,
  },
  {
    id: "burp",
    name: "Burp Suite",
    category: "WEB APPLICATION SECURITY",
    description:
      "Integrated web application security testing with live Burp status, Proxy, Repeater, HTTP history, testing utilities and edition-aware capabilities.",
    url: "",
    status: "external",
    icon: Globe,
  },
  {
    id: "httpx",
    name: "HTTPX / ProjectDiscovery",
    category: "WEB RECONNAISSANCE",
    description:
      "Fast HTTP probing, status detection, technology identification, response telemetry, DNS metadata and web-service reconnaissance.",
    url: "",
    status: "online",
    icon: Globe,
  },
  {
    id: "wazuh",
    name: "Wazuh",
    category: "SIEM / XDR",
    description:
      "Security monitoring, endpoint detection, file integrity monitoring, vulnerability detection and threat hunting.",
    url: "https://127.0.0.1:443",
    status: "offline",
    icon: Server,
  },
  {
    id: "zeek",
    name: "Zeek",
    category: "NETWORK SECURITY MONITORING",
    description:
      "Passive network visibility, protocol analysis and high-fidelity network security logging.",
    url: "",
    status: "external",
    icon: Network,
  },
  {
    id: "suricata",
    name: "Suricata",
    category: "IDS / IPS",
    description:
      "Network intrusion detection, intrusion prevention and deep packet inspection.",
    url: "",
    status: "external",
    icon: Radar,
  },
  {
    id: "grafana",
    name: "Grafana",
    category: "SECURITY VISUALIZATION",
    description:
      "Interactive dashboards for security events, infrastructure metrics, logs and operational telemetry.",
    url: "http://127.0.0.1:3000",
    status: "offline",
    icon: BarChart3,
  },
];

const statusConfig = {
  ready: {
    label: "READY",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: CheckCircle2,
  },
    online: {
    label: "ONLINE",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: CheckCircle2,
  },
  offline: {
    label: "NOT CONNECTED",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-400",
    icon: CircleOff,
  },
  external: {
    label: "EXTERNAL TOOL",
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-400",
    icon: ExternalLink,
  },
};


export const SecurityArsenal: React.FC<SecurityArsenalProps> = ({
  onLaunch,
  onOpenObservium,
  onOpenGreenbone,
  onOpenTShark,
  onOpenBurp,
  onOpenHttpx,
  onOpenWazuh,
}) => {
    const [integrationStatuses, setIntegrationStatuses] =
    useState<Record<string, IntegrationStatus>>({});

  const [integrationLoading, setIntegrationLoading] =
    useState(true);

  const [lastRefresh, setLastRefresh] =
    useState<Date | null>(null);

  const [burpStatus, setBurpStatus] =
    useState<BurpStatus | null>(null);

  const [burpCapabilities, setBurpCapabilities] =
    useState<BurpCapability[]>([]);

  const [burpLoading, setBurpLoading] =
    useState(true);

  const [burpLaunching, setBurpLaunching] =
    useState(false);

  const [burpTargets, setBurpTargets] =
    useState<BurpTarget[]>([]);

  const [burpScope, setBurpScope] =
    useState<BurpScopeEntry[]>([]);

  const [burpHistory, setBurpHistory] =
    useState<BurpHttpRecord[]>([]);

  const [burpSiteMap, setBurpSiteMap] =
    useState<BurpSiteMapEntry[]>([]);

  const [burpDataLoading, setBurpDataLoading] =
    useState(false);

  const [burpDataError, setBurpDataError] =
    useState<string | null>(null);

  const loadIntegrationStatuses = useCallback(async () => {
    try {
      setIntegrationLoading(true);

      const response = await fetch(
        "/api/integrations/status"
      );

      if (!response.ok) {
        throw new Error(
          `Integration status request failed: ${response.status}`
        );
      }

      const data =
        (await response.json()) as IntegrationStatusResponse;

      const statusMap =
        data.integrations.reduce(
          (
            map: Record<string, IntegrationStatus>,
            integration
          ) => {
            map[integration.id] = integration;
            return map;
          },
          {}
        );

      setIntegrationStatuses(statusMap);
      setLastRefresh(new Date());
    } catch (error) {
      console.error(
        "Failed to load Security Arsenal integration status:",
        error
      );
    } finally {
      setIntegrationLoading(false);
    }
  }, []);

  const loadBurpStatus = useCallback(async () => {
    try {
      setBurpLoading(true);

      const [statusResponse, capabilitiesResponse] =
        await Promise.all([
          fetch("/api/integrations/burp/status", {
            credentials: "include",
          }),
          fetch("/api/integrations/burp/capabilities", {
            credentials: "include",
          }),
        ]);

      if (!statusResponse.ok) {
        throw new Error(
          `Burp status request failed: ${statusResponse.status}`
        );
      }

      if (!capabilitiesResponse.ok) {
        throw new Error(
          `Burp capability request failed: ${capabilitiesResponse.status}`
        );
      }

      const statusData =
        (await statusResponse.json()) as BurpStatusResponse;

      const capabilitiesData =
        (await capabilitiesResponse.json()) as BurpCapabilitiesResponse;

      if (statusData.success) {
        setBurpStatus(statusData.status);
      }

      if (capabilitiesData.success) {
        setBurpCapabilities(
          Array.isArray(capabilitiesData.capabilities)
            ? capabilitiesData.capabilities
            : []
        );
      }
    } catch (error) {
      console.error(
        "Failed to load Burp Suite integration status:",
        error
      );
    } finally {
      setBurpLoading(false);
    }
  }, []);

  const loadBurpDataPlane = useCallback(async () => {
    try {
      setBurpDataLoading(true);
      setBurpDataError(null);

      const [
        targetsResponse,
        scopeResponse,
        historyResponse,
        siteMapResponse,
      ] = await Promise.all([
        fetch("/api/integrations/burp/targets", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/scope", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/history", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/site-map", {
          credentials: "include",
        }),
      ]);

      const [
        targetsPayload,
        scopePayload,
        historyPayload,
        siteMapPayload,
      ] = await Promise.all([
        targetsResponse.json(),
        scopeResponse.json(),
        historyResponse.json(),
        siteMapResponse.json(),
      ]);

      if (!targetsResponse.ok || !targetsPayload?.success) {
        throw new Error(
          targetsPayload?.error ||
          "Unable to load Burp targets."
        );
      }

      if (!scopeResponse.ok || !scopePayload?.success) {
        throw new Error(
          scopePayload?.error ||
          "Unable to load Burp scope."
        );
      }

      if (!historyResponse.ok || !historyPayload?.success) {
        throw new Error(
          historyPayload?.error ||
          "Unable to load Burp HTTP history."
        );
      }

      if (!siteMapResponse.ok || !siteMapPayload?.success) {
        throw new Error(
          siteMapPayload?.error ||
          "Unable to load Burp site map."
        );
      }

      const targetsData =
        targetsPayload as BurpTargetsResponse;

      const scopeData =
        scopePayload as BurpScopeResponse;

      const historyData =
        historyPayload as BurpHistoryResponse;

      const siteMapData =
        siteMapPayload as BurpSiteMapResponse;

      setBurpTargets(
        Array.isArray(targetsData.targets)
          ? targetsData.targets
          : []
      );

      setBurpScope(
        Array.isArray(scopeData.scope)
          ? scopeData.scope
          : []
      );

      setBurpHistory(
        Array.isArray(historyData.history)
          ? historyData.history
          : []
      );

      setBurpSiteMap(
        Array.isArray(siteMapData.siteMap)
          ? siteMapData.siteMap
          : []
      );
    } catch (error: any) {
      console.error(
        "Failed to load Burp data plane:",
        error
      );

      setBurpDataError(
        error?.message ||
        "Unable to load Burp data-plane telemetry."
      );
    } finally {
      setBurpDataLoading(false);
    }
  }, []);


  useEffect(() => {
    loadIntegrationStatuses();
    loadBurpStatus();
    loadBurpDataPlane();

    const interval = window.setInterval(() => {
      loadIntegrationStatuses();
      loadBurpStatus();
      loadBurpDataPlane();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    loadIntegrationStatuses,
    loadBurpStatus,
    loadBurpDataPlane,
  ]);

  const formatCheckedAt = (
    value: string | undefined
  ) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }; 
  const handleLaunch = (tool: SecurityTool) => {
    if (!tool.url) {
      alert(
        `${tool.name} is a local/external security application. Launch it from the Kali desktop environment.`
      );
      return;
    }

    onLaunch(tool.url);
  };

  const handleLaunchBurp = async () => {
    try {
      setBurpLaunching(true);

      const response = await fetch(
        "/api/integrations/burp/launch",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
          data?.message ||
          `Burp launch failed with HTTP ${response.status}`
        );
      }

      await new Promise((resolve) =>
        window.setTimeout(resolve, 1500)
      );

      await loadBurpStatus();
      await loadBurpDataPlane();
    } catch (error: any) {
      console.error(
        "Failed to launch Burp Suite:",
        error
      );

      alert(
        error?.message ||
        "Unable to launch Burp Suite."
      );
    } finally {
      setBurpLaunching(false);
    }
  };

 return (
  <section className="space-y-5">

    {/* Header */}
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-start gap-4">
           <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-lg font-bold uppercase tracking-widest text-white">
                Security Arsenal
              </h2>

              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                CYBERLAB BRANCHES
              </span>
            </div>

            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              Central launch and integration point for third-party
              cybersecurity platforms operating alongside Kali CyberLab.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Arsenal Status
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-mono text-xs font-bold text-emerald-400">
                CENTRAL HUB ONLINE
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadIntegrationStatuses}
            disabled={integrationLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Activity
              className={`h-3.5 w-3.5 ${
                integrationLoading ? "animate-spin" : ""
              }`}
            />

            {integrationLoading
              ? "CHECKING..."
              : "REFRESH STATUS"}
          </button>
        </div>

      </div>

      {lastRefresh && (
        <div className="mt-3 border-t border-slate-800 pt-3 text-right font-mono text-[8px] uppercase tracking-wider text-slate-600">
          Last dashboard refresh: {formatCheckedAt(lastRefresh.toISOString())}
        </div>
      )}
    </div>

    {/* Architecture Banner */}
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Network className="h-4 w-4 text-emerald-400" />

        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          CYBERLAB ARCHITECTURE
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center">

        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-center">
          <div className="text-xs font-bold text-emerald-400">
            KALI CYBERLAB
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">
            CENTRAL COMMAND
          </div>
        </div>

        <div className="hidden h-px w-12 bg-slate-700 md:block" />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            "Vulnerability",
            "Monitoring",
            "SIEM / XDR",
            "Network Defense",
          ].map((branch) => (
            <div
              key={branch}
              className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-center"
            >
              <div className="text-[9px] font-bold uppercase text-slate-400">
                {branch}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>

    {/* Tool Grid */}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

      {tools.map((tool) => {
        const Icon = tool.icon;

        const integration =
          integrationStatuses[tool.id];

        const effectiveStatus =
          tool.id === "burp" && burpStatus
            ? burpStatus.running
              ? "online"
              : burpStatus.installed
                ? "offline"
                : "not-configured"
            : integration?.status === "online"
              ? "online"
              : integration?.status === "offline"
                ? "offline"
                : integration?.status === "not-configured"
                  ? "not-configured"
                  : tool.status;

        const status =
          effectiveStatus === "not-configured"
            ? statusConfig.offline
            : statusConfig[effectiveStatus];

        const StatusIcon = status.icon;

        return (
          <article
            key={tool.id}
            className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl"
          >

            {/* Tool Header */}
            <div className="flex items-start justify-between gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>

              <div
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${status.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </div>

            </div>

            {/* Tool Information */}
            <div className="mt-4 flex-1">

              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                {tool.category}
              </div>

              <h3 className="mt-1 font-mono text-base font-bold text-white">
                {tool.name}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {tool.description}
              </p>

            </div>

            {/* Endpoint */}
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                ENDPOINT
              </div>

              <div className="mt-1 truncate font-mono text-[10px] text-slate-400">
                {tool.url || "KALI DESKTOP APPLICATION"}
              </div>
            </div>

            {/* Live Health */}
            {integration && (
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">

                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    LIVE HEALTH
                  </div>

                  {integrationLoading && (
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-sky-400">
                      CHECKING...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">

                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                      Response
                    </div>

                    <div className="mt-1 font-mono text-[10px] font-bold text-slate-300">
                      {integration.responseTimeMs !== null
                        ? `${integration.responseTimeMs} ms`
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                      HTTP
                    </div>

                    <div className="mt-1 font-mono text-[10px] font-bold text-slate-300">
                      {integration.message.match(/HTTP \d+/)?.[0] || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                      Checked
                    </div>

                    <div className="mt-1 font-mono text-[10px] font-bold text-slate-300">
                      {formatCheckedAt(integration.checkedAt)}
                    </div>
                  </div>

                </div>

                <div className="mt-2 border-t border-slate-800 pt-2 font-mono text-[8px] text-slate-500">
                  {integration.message}
                </div>

              </div>
            )}

            {/* Actions */}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">

              <button
                onClick={() =>
                  tool.id === "greenbone"
                    ? onOpenGreenbone()
                    : tool.id === "observium"
                      ? onOpenObservium()
                      : tool.id === "tshark"
                        ? onOpenTShark()
                        : tool.id === "burp"
                          ? onOpenBurp()
                          : tool.id === "httpx"
                            ? onOpenHttpx()
                            : tool.id === "wazuh"
                              ? onOpenWazuh()
                              : handleLaunch(tool)
                }
                disabled={false}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />

                {tool.id === "greenbone" ||
                tool.id === "observium" ||
                tool.id === "tshark" ||
                tool.id === "burp" ||
                tool.id === "httpx" ||
                tool.id === "wazuh"
                  ? "Open Dashboard"
                  : "Launch Tool"}
              </button>

              <button
                onClick={() =>
                  alert(
                    `${tool.name} integration settings will be added during the integration phase.`
                  )
                }
                className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
                title={`Configure ${tool.name}`}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>

            </div>

          </article>
        );
      })}

    </div>

</section>
);
}; 