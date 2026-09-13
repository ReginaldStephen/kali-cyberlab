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
} from "lucide-react";

interface SecurityArsenalProps {
  onLaunch: (url: string) => void;
  onOpenObservium: () => void;
  onOpenGreenbone: () => void;
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
    url: "http://45.222.128.31/observium",
    status: "ready",
    icon: Activity,
  },
  {
    id: "burp",
    name: "Burp Suite",
    category: "WEB APPLICATION SECURITY",
    description:
      "Professional web application security testing with Proxy, Repeater, Intruder and Scanner.",
    url: "",
    status: "external",
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
}) => {
    const [integrationStatuses, setIntegrationStatuses] =
    useState<Record<string, IntegrationStatus>>({});

  const [integrationLoading, setIntegrationLoading] =
    useState(true);

  const [lastRefresh, setLastRefresh] =
    useState<Date | null>(null);
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
 useEffect(() => {
  loadIntegrationStatuses();

  const interval = window.setInterval(() => {
    loadIntegrationStatuses();
  }, 30000);

  return () => {
    window.clearInterval(interval);
  };
}, [
  loadIntegrationStatuses,
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
          integration?.status === "online"
            ? "online"
            : integration?.status === "offline"
              ? "offline"
              : integration?.status === "not-configured"
                ? "not-configured"
                : tool.status;

        const status = statusConfig[effectiveStatus];
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
                : handleLaunch(tool)
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {tool.id === "greenbone" || tool.id === "observium"
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