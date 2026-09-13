import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
type AlertPriority = "none" | "normal" | "important" | "immediate";
type AlertStatus = "pending" | "acknowledged" | "resolved";

interface CyberLabAlert {
  id: string;
  eventId: string;
  createdAt: string;
  severity: AlertSeverity;
  priority: AlertPriority;
  status: AlertStatus;
  source: string;
  type: string;
  title: string;
  message: string;
  target?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface AlertStats {
  total: number;
  pending: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
}

const severityConfig: Record<
  AlertSeverity,
  {
    label: string;
    icon: typeof AlertCircle;
    classes: string;
  }
> = {
  critical: {
    label: "Critical",
    icon: XCircle,
    classes: "border-red-500/40 bg-red-950/30 text-red-300",
  },
  high: {
    label: "High",
    icon: ShieldAlert,
    classes: "border-orange-500/40 bg-orange-950/30 text-orange-300",
  },
  medium: {
    label: "Medium",
    icon: AlertTriangle,
    classes: "border-yellow-500/40 bg-yellow-950/30 text-yellow-300",
  },
  low: {
    label: "Low",
    icon: AlertCircle,
    classes: "border-blue-500/40 bg-blue-950/30 text-blue-300",
  },
  info: {
    label: "Info",
    icon: Bell,
    classes: "border-slate-500/40 bg-slate-900/40 text-slate-300",
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AlertCenter() {
  const [alerts, setAlerts] = useState<CyberLabAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
  });

  const [filter, setFilter] = useState<
    "all" | AlertStatus | AlertSeverity
  >("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAlerts = useCallback(async () => {
    try {
      setError("");

      const [alertsResponse, statsResponse] = await Promise.all([
        fetch("/api/ai/alerts?limit=200", {
          credentials: "include",
        }),
        fetch("/api/ai/alerts/stats", {
          credentials: "include",
        }),
      ]);

      if (
        alertsResponse.status === 401 ||
        statsResponse.status === 401
      ) {
        throw new Error("Authentication required.");
      }

      if (!alertsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to retrieve CyberLab alerts.");
      }

      const alertsData = await alertsResponse.json();
      const statsData = await statsResponse.json();

      setAlerts(
        Array.isArray(alertsData.alerts)
          ? alertsData.alerts
          : []
      );

      setStats(
        statsData.stats || {
          total: 0,
          pending: 0,
          acknowledged: 0,
          resolved: 0,
          critical: 0,
          high: 0,
          medium: 0,
        }
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load alerts.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();

    const interval = window.setInterval(
      loadAlerts,
      15000
    );

    return () => window.clearInterval(interval);
  }, [loadAlerts]);

  async function updateStatus(
    alertId: string,
    status: "acknowledged"
  ) {
    try {
      const response = await fetch(
        `/api/ai/alerts/${alertId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(
          () => null
        );

        throw new Error(
          data?.error ||
            "Failed to update alert status."
        );
      }

      await loadAlerts();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to update alert."
      );
    }
  }

  const filteredAlerts = useMemo(() => {
    if (filter === "all") {
      return alerts;
    }

    if (
      filter === "pending" ||
      filter === "acknowledged"
    ) {
      return alerts.filter(
        (alert) => alert.status === filter
      );
    }

    return alerts.filter(
      (alert) => alert.severity === filter
    );
  }, [alerts, filter]);

  function refresh() {
    setIsRefreshing(true);
    loadAlerts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/30">
              <Bell className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                Alert Center
              </h1>

              <p className="text-sm text-slate-400">
                Centralized CyberLab security alerts
                and operator actions.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isRefreshing
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-slate-700"
        >
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Total
          </div>

          <div className="mt-2 text-2xl font-bold text-white">
            {stats.total}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("pending")}
          className="rounded-xl border border-yellow-700/30 bg-yellow-950/10 p-4 text-left transition hover:border-yellow-600/50"
        >
          <div className="text-xs uppercase tracking-wider text-yellow-500">
            Pending
          </div>

          <div className="mt-2 text-2xl font-bold text-yellow-300">
            {stats.pending}
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter("acknowledged")
          }
          className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4 text-left transition hover:border-blue-600/50"
        >
          <div className="text-xs uppercase tracking-wider text-blue-500">
            Acknowledged
          </div>

          <div className="mt-2 text-2xl font-bold text-blue-300">
            {stats.acknowledged}
          </div>
        </button>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Resolved
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-400">
            {stats.resolved}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFilter("critical")}
          className="rounded-xl border border-red-700/30 bg-red-950/10 p-4 text-left transition hover:border-red-600/50"
        >
          <div className="text-xs uppercase tracking-wider text-red-500">
            Critical
          </div>

          <div className="mt-2 text-2xl font-bold text-red-300">
            {stats.critical}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("high")}
          className="rounded-xl border border-orange-700/30 bg-orange-950/10 p-4 text-left transition hover:border-orange-600/50"
        >
          <div className="text-xs uppercase tracking-wider text-orange-500">
            High
          </div>

          <div className="mt-2 text-2xl font-bold text-orange-300">
            {stats.high}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("medium")}
          className="rounded-xl border border-yellow-700/30 bg-yellow-950/10 p-4 text-left transition hover:border-yellow-600/50"
        >
          <div className="text-xs uppercase tracking-wider text-yellow-500">
            Medium
          </div>

          <div className="mt-2 text-2xl font-bold text-yellow-300">
            {stats.medium}
          </div>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          "all",
          "pending",
          "acknowledged",
          "critical",
          "high",
          "medium",
        ].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setFilter(
                value as typeof filter
              )
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === value
                ? "border-red-600/60 bg-red-950/40 text-red-300"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">
              Security Alerts
            </h2>

            <p className="text-xs text-slate-500">
              Showing {filteredAlerts.length} alert(s)
            </p>
          </div>

          <Clock3 className="h-5 w-5 text-slate-500" />
        </div>

        <div className="divide-y divide-slate-800">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading CyberLab alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/70" />

              <p className="mt-3 font-medium text-slate-300">
                No alerts match this filter.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                CyberLab will display new security
                alerts here automatically.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const config =
                severityConfig[
                  alert.severity
                ] || severityConfig.info;

              const SeverityIcon =
                config.icon;

              return (
                <div
                  key={alert.id}
                  className="p-5 transition hover:bg-slate-900/40"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.classes}`}
                        >
                          <SeverityIcon className="h-3.5 w-3.5" />

                          {config.label}
                        </span>

                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs capitalize text-slate-400">
                          {alert.priority}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs capitalize ${
                            alert.status ===
                            "pending"
                              ? "border-yellow-700/40 bg-yellow-950/20 text-yellow-300"
                              : alert.status ===
                                "acknowledged"
                              ? "border-blue-700/40 bg-blue-950/20 text-blue-300"
                              : "border-emerald-700/40 bg-emerald-950/20 text-emerald-300"
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-white">
                        {alert.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {alert.message}
                      </p>

                      <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="uppercase tracking-wider text-slate-600">
                            Source
                          </span>

                          <div className="mt-1 text-slate-300">
                            {alert.source}
                          </div>
                        </div>

                        <div>
                          <span className="uppercase tracking-wider text-slate-600">
                            Type
                          </span>

                          <div className="mt-1 text-slate-300">
                            {alert.type}
                          </div>
                        </div>

                        <div>
                          <span className="uppercase tracking-wider text-slate-600">
                            Target
                          </span>

                          <div className="mt-1 text-slate-300">
                            {alert.target || "—"}
                          </div>
                        </div>

                        <div>
                          <span className="uppercase tracking-wider text-slate-600">
                            Created
                          </span>

                          <div className="mt-1 text-slate-300">
                            {formatDate(
                              alert.createdAt
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {alert.status === "pending" && (
                      <div className="flex shrink-0 xl:pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              alert.id,
                              "acknowledged"
                            )
                          }
                          className="rounded-lg border border-blue-700/50 bg-blue-950/20 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-950/40"
                        >
                          Acknowledge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
