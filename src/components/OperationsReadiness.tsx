import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  Database,
  ExternalLink,
  PackageCheck,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Wifi,
  XCircle,
} from "lucide-react";

interface RegistryItem {
  id: string;
  name: string;
  category?: string;
  mode?: string;
  installed?: boolean;
  configured?: boolean;
  processRunning?: boolean;
  healthy?: boolean;
  integrated?: boolean;
  ready?: boolean;
  optional?: boolean;
  available?: boolean;
  version?: string | null;
  detail?: string;
  reason?: string;
}

interface RegistryResponse {
  status?: "ready" | "degraded" | "critical" | string;
  ready?: boolean;
  checkedAt?: string;
  timestamp?: string;
  generatedAt?: string;
  summary?: {
    total?: number;
    ready?: number;
    available?: number;
    running?: number;
    unhealthy?: number;
    notInstalled?: number;
    notConfigured?: number;
  };
  entries?: RegistryItem[];
  items?: RegistryItem[];
  tools?: RegistryItem[];
  services?: RegistryItem[];
  registry?: RegistryItem[];
}

interface OperationsReadinessProps {
  onNavigate?: (tab: string) => void;
}

interface AiStatus {
  success?: boolean;
  providers?: Array<{
    id?: string;
    displayName?: string;
    available?: boolean;
  }>;
  runtime?: {
    providerId?: string | null;
    providerDisplayName?: string | null;
    status?: string;
  };
}

interface BurpStatus {
  installed?: boolean;
  running?: boolean;
  integrationState?: string;
  proxyListener?: {
    address?: string;
    port?: number;
    protocol?: string;
  };
  message?: string;
}

interface TelegramStatus {
  configured?: boolean;
  botTokenConfigured?: boolean;
  chatIdConfigured?: boolean;
}

interface ReadinessCard {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  tab?: string;
  state: "ready" | "offline" | "optional" | "unknown";
}

const registryItemNames: Record<string, string[]> = {
  platform: ["cyberlab"],
  greenbone: ["greenbone-gvmd", "greenbone-ospd", "greenbone-redis", "greenbone-web"],
  burp: ["burp-suite"],
  httpx: ["httpx"],
  observium: ["observium"],
  defectdojo: ["defectdojo"],
  tshark: ["tshark"],
  ai: [],
  telegram: [],
};

function getItems(data: RegistryResponse | null): RegistryItem[] {
  if (!data) return [];

  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.tools)) return data.tools;
  if (Array.isArray(data.services)) return data.services;
  if (Array.isArray(data.registry)) return data.registry;

  return [];
}

function findItem(
  items: RegistryItem[],
  ids: string[]
): RegistryItem | undefined {
  return items.find((item) => ids.includes(item.id));
}

function isOperational(item: RegistryItem | undefined): boolean {
  if (!item) return false;

  if (item.ready === true) return true;

  return (
    item.installed === true &&
    item.configured !== false &&
    item.healthy !== false &&
    item.available !== false
  );
}

function formatCheckedAt(data: RegistryResponse | null): string {
  const value =
    data?.checkedAt ||
    data?.timestamp ||
    data?.generatedAt;

  if (!value) return "NOT YET CHECKED";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "RECENT CHECK";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export const OperationsReadiness: React.FC<OperationsReadinessProps> = ({
  onNavigate,
}) => {
  const [registry, setRegistry] = useState<RegistryResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [burpStatus, setBurpStatus] = useState<BurpStatus | null>(null);
  const [telegramStatus, setTelegramStatus] =
    useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRegistry = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [registryResponse, aiResponse, burpResponse, telegramResponse] =
        await Promise.all([
          fetch("/api/system/registry", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/ai/status", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/integrations/burp/status", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/system/telegram-status", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

      const data = (await registryResponse.json()) as RegistryResponse & {
        error?: string;
      };

      if (!registryResponse.ok) {
        throw new Error(
          data?.error ||
            `Operations registry request failed: HTTP ${registryResponse.status}`
        );
      }

      setRegistry(data);

      if (aiResponse.ok) {
        setAiStatus((await aiResponse.json()) as AiStatus);
      } else {
        setAiStatus(null);
      }

      if (burpResponse.ok) {
        setBurpStatus((await burpResponse.json()) as BurpStatus);
      } else {
        setBurpStatus(null);
      }

      if (telegramResponse.ok) {
        setTelegramStatus(
          (await telegramResponse.json()) as TelegramStatus
        );
      } else {
        setTelegramStatus(null);
      }
    } catch (err: any) {
      console.error("Operations readiness registry error:", err);
      setError(err?.message || "Unable to load operations registry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRegistry();

    const timer = window.setInterval(() => {
      void loadRegistry();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [loadRegistry]);

  const items = useMemo(() => getItems(registry), [registry]);

  const platformItem = findItem(items, registryItemNames.platform);
  const greenboneItems = registryItemNames.greenbone
    .map((id) => findItem(items, [id]))
    .filter(Boolean) as RegistryItem[];

  const greenboneReady =
    greenboneItems.length > 0 &&
    greenboneItems.every((item) => isOperational(item));

  const burpItem = findItem(items, registryItemNames.burp);
  const httpxItem = findItem(items, registryItemNames.httpx);
  const observiumItem = findItem(items, registryItemNames.observium);
  const defectdojoItem = findItem(items, registryItemNames.defectdojo);
  const tsharkItem = findItem(items, registryItemNames.tshark);

  const aiReady = Boolean(
    aiStatus?.success === true &&
      aiStatus.providers?.some(
        (provider) =>
          provider.id === "gemini" &&
          provider.available === true
      )
  );

  const burpConnected = Boolean(
    burpStatus?.installed === true &&
      burpStatus?.running === true &&
      burpStatus?.integrationState === "listener-ready" &&
      burpStatus?.proxyListener?.port === 8888
  );

  const telegramReady = telegramStatus?.configured === true;

  const readinessCards: ReadinessCard[] = [
    {
      id: "platform",
      label: "PLATFORM",
      description: "CyberLab core runtime",
      icon: <Server className="h-4 w-4" />,
      state: loading
        ? "unknown"
        : isOperational(platformItem)
          ? "ready"
          : "offline",
    },
    {
      id: "greenbone",
      label: "GREENBONE",
      description: "GVM / OpenVAS stack",
      icon: <ShieldCheck className="h-4 w-4" />,
      tab: "greenbone",
      state: loading
        ? "unknown"
        : greenboneReady
          ? "ready"
          : "offline",
    },
    {
      id: "burp",
      label: "BURP",
      description: "Proxy integration",
      icon: <Radio className="h-4 w-4" />,
      tab: "burp",
      state: loading
        ? "unknown"
        : burpConnected
          ? "ready"
          : burpItem?.installed
            ? "optional"
            : "offline",
    },
    {
      id: "httpx",
      label: "HTTPX",
      description: "Web reconnaissance",
      icon: <Wifi className="h-4 w-4" />,
      tab: "httpx",
      state: loading
        ? "unknown"
        : isOperational(httpxItem)
          ? "ready"
          : "offline",
    },
    {
      id: "observium",
      label: "OBSERVIUM",
      description: "Network monitoring",
      icon: <Activity className="h-4 w-4" />,
      tab: "observium",
      state: loading
        ? "unknown"
        : isOperational(observiumItem)
          ? "ready"
          : "offline",
    },
    {
      id: "defectdojo",
      label: "DEFECTDOJO",
      description: "Finding management",
      icon: <Database className="h-4 w-4" />,
      state: loading
        ? "unknown"
        : isOperational(defectdojoItem)
          ? "ready"
          : "offline",
    },
    {
      id: "tshark",
      label: "TSHARK",
      description: "Packet analysis",
      icon: <Terminal className="h-4 w-4" />,
      tab: "tshark",
      state: loading
        ? "unknown"
        : isOperational(tsharkItem)
          ? "ready"
          : "offline",
    },
    {
      id: "ai",
      label: "AI PROVIDER",
      description: "CyberLab AI runtime",
      icon: <Bot className="h-4 w-4" />,
      tab: "home",
      state: loading
        ? "unknown"
        : aiReady
          ? "ready"
          : "unknown",
    },
    {
      id: "telegram",
      label: "TELEGRAM",
      description: "Command / alert channel",
      icon: <Radio className="h-4 w-4" />,
      state: loading
        ? "unknown"
        : telegramReady
          ? "ready"
          : "unknown",
    },
  ];

  const summary = registry?.summary;

  const optionalOffline = items.filter(
    (item) =>
      item.optional &&
      item.ready !== true &&
      item.available !== true
  );

  const platformReady =
    registry?.ready === true ||
    registry?.status === "ready";

  const statusLabel = loading
    ? "CHECKING"
    : error
      ? "REGISTRY ERROR"
      : platformReady
        ? "PLATFORM READY"
        : registry?.status === "critical"
          ? "CRITICAL"
          : "DEGRADED";

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                platformReady
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {platformReady ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-[0.2em] text-white">
                  OPERATIONS READINESS
                </h2>

                <span
                  className={`rounded border px-2 py-0.5 text-[9px] font-black tracking-widest ${
                    platformReady
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                Authoritative service and security-tool readiness layer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadRegistry(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-black tracking-widest text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            {refreshing ? "REFRESHING" : "REFRESH READINESS"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-3 lg:grid-cols-5">
          {readinessCards.map((card) => {
            const clickable = Boolean(card.tab && onNavigate);

            const content = (
              <div
                className={`group min-h-[92px] bg-slate-950 p-3 transition ${
                  clickable
                    ? "cursor-pointer hover:bg-slate-900"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                      card.state === "ready"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : card.state === "offline"
                          ? "border-slate-700 bg-slate-900 text-slate-500"
                          : card.state === "optional"
                            ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-400"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                    }`}
                  >
                    {card.icon}
                  </div>

                  {card.state === "ready" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : card.state === "offline" ? (
                    <XCircle className="h-3.5 w-3.5 text-slate-600" />
                  ) : card.state === "optional" ? (
                    <PackageCheck className="h-3.5 w-3.5 text-cyan-400" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 animate-pulse text-slate-600" />
                  )}
                </div>

                <div className="mt-2">
                  <div className="text-[10px] font-black tracking-wider text-slate-200">
                    {card.label}
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-500">
                    {card.state === "ready"
                      ? "READY"
                      : card.state === "offline"
                        ? "OFFLINE"
                        : card.state === "optional"
                          ? "ON-DEMAND"
                          : "CHECKING"}
                  </div>
                </div>

                <div className="mt-1 truncate text-[9px] text-slate-600">
                  {card.description}
                </div>

                {clickable && (
                  <ExternalLink className="absolute hidden" />
                )}
              </div>
            );

            if (!clickable) {
              return <React.Fragment key={card.id}>{content}</React.Fragment>;
            }

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigate?.(card.tab!)}
                className="text-left"
              >
                {content}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900/40 px-5 py-3 text-[10px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-500">
            <span>
              READY{" "}
              <strong className="text-emerald-400">
                {summary?.ready ?? "—"}
              </strong>
              {summary?.total ? ` / ${summary.total}` : ""}
            </span>

            <span>
              AVAILABLE{" "}
              <strong className="text-cyan-400">
                {summary?.available ?? "—"}
              </strong>
            </span>

            <span>
              RUNNING{" "}
              <strong className="text-white">
                {summary?.running ?? "—"}
              </strong>
            </span>

            <span>
              UNHEALTHY{" "}
              <strong
                className={
                  Number(summary?.unhealthy || 0) > 0
                    ? "text-amber-400"
                    : "text-emerald-400"
                }
              >
                {summary?.unhealthy ?? 0}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <span>LAST CHECK</span>
            <span className="font-mono text-slate-400">
              {formatCheckedAt(registry)}
            </span>
          </div>
        </div>

        {optionalOffline.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950/60 px-5 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-slate-600">
                OPTIONAL / NOT ACTIVE
              </span>

              {optionalOffline.slice(0, 6).map((item) => (
                <span
                  key={item.id}
                  className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[9px] font-mono text-slate-500"
                >
                  {item.name || item.id}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="border-t border-amber-500/20 bg-amber-500/5 px-5 py-3 text-[10px] text-amber-300">
            {error}
          </div>
        )}
      </div>
    </section>
  );
};
