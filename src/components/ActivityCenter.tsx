import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
  XCircle,
} from "lucide-react";

import type {
  CyberLabAlert,
  CyberLabEvent,
  CyberLabEventSeverity as EventSeverity,
} from "../types";

type AlertStats = {
  total: number;
  pending: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
};

type ViewMode = "all" | "events" | "alerts";
type AlertFilter = "all" | "pending" | "acknowledged" | "resolved";
type SeverityFilter = "all" | EventSeverity;

const severityConfig: Record<
  EventSeverity,
  {
    label: string;
    icon: React.ElementType;
    classes: string;
  }
> = {
  critical: {
    label: "Critical",
    icon: XCircle,
    classes: "border-red-500/40 bg-red-500/10 text-red-300",
  },
  high: {
    label: "High",
    icon: CircleAlert,
    classes: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  },
  medium: {
    label: "Medium",
    icon: ShieldAlert,
    classes: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  },
  low: {
    label: "Low",
    icon: Activity,
    classes: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  },
  info: {
    label: "Info",
    icon: Info,
    classes: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  },
};

const defaultStats: AlertStats = {
  total: 0,
  pending: 0,
  acknowledged: 0,
  resolved: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function severityRank(severity: EventSeverity) {
  return {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  }[severity];
}

function getSeverityClasses(severity: EventSeverity) {
  return severityConfig[severity]?.classes ?? severityConfig.info.classes;
}

function SeverityIcon({
  severity,
  className = "h-4 w-4",
}: {
  severity: EventSeverity;
  className?: string;
}) {
  const Icon = severityConfig[severity]?.icon ?? Info;
  return <Icon className={className} />;
}

export function ActivityCenter() {
  const [events, setEvents] = useState<CyberLabEvent[]>([]);
  const [alerts, setAlerts] = useState<CyberLabAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>(defaultStats);

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [alertFilter, setAlertFilter] = useState<AlertFilter>("all");
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all");

  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
    new Set()
  );

  const loadActivity = useCallback(
    async (manual = false) => {
      if (manual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const [eventsResponse, alertsResponse, statsResponse] =
          await Promise.all([
            fetch("/api/ai/events?limit=200", {
              credentials: "include",
            }),
            fetch("/api/ai/alerts?limit=200", {
              credentials: "include",
            }),
            fetch("/api/ai/alerts/stats", {
              credentials: "include",
            }),
          ]);

        if (!eventsResponse.ok) {
          throw new Error("Unable to load CyberLab events.");
        }

        if (!alertsResponse.ok) {
          throw new Error("Unable to load CyberLab alerts.");
        }

        const eventsData = await eventsResponse.json();
        const alertsData = await alertsResponse.json();

        let statsData = defaultStats;

        if (statsResponse.ok) {
          statsData = {
            ...defaultStats,
            ...(await statsResponse.json()),
          };
        }

        setEvents(
          Array.isArray(eventsData)
            ? eventsData
            : Array.isArray(eventsData?.events)
              ? eventsData.events
              : []
        );

        setAlerts(
          Array.isArray(alertsData)
            ? alertsData
            : Array.isArray(alertsData?.alerts)
              ? alertsData.alerts
              : []
        );

        setStats(statsData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load CyberLab activity."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadActivity();

    const interval = window.setInterval(() => {
      loadActivity();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadActivity]);

  async function updateStatus(
    alertId: string,
    status: "acknowledged" | "resolved"
  ) {
    try {
      const response = await fetch(`/api/ai/alerts/${alertId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Unable to update alert status.");
      }

      await loadActivity(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update alert status."
      );
    }
  }

  const sources = useMemo(() => {
    const values = new Set<string>();

    for (const event of events) {
      if (event.source) {
        values.add(event.source);
      }
    }

    for (const alert of alerts) {
      if (alert.source) {
        values.add(alert.source);
      }
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [events, alerts]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (
          severityFilter !== "all" &&
          event.severity !== severityFilter
        ) {
          return false;
        }

        if (
          sourceFilter !== "all" &&
          event.source !== sourceFilter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          event.type,
          event.source,
          event.title,
          event.message,
          event.target ?? "",
          JSON.stringify(event.metadata ?? {}),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );
  }, [events, severityFilter, sourceFilter, normalizedSearch]);

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        if (
          alertFilter !== "all" &&
          alert.status !== alertFilter
        ) {
          return false;
        }

        if (
          severityFilter !== "all" &&
          alert.severity !== severityFilter
        ) {
          return false;
        }

        if (
          sourceFilter !== "all" &&
          alert.source !== sourceFilter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          alert.source,
          alert.status,
          alert.severity,
          alert.priority,
          alert.id,
          alert.eventId,
          JSON.stringify(alert),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [
    alerts,
    alertFilter,
    severityFilter,
    sourceFilter,
    normalizedSearch,
  ]);

  const activeAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          alert.status === "pending" ||
          alert.status === "acknowledged"
      ).length,
    [alerts]
  );

  const criticalCount = stats.critical ?? 0;
  const highCount = stats.high ?? 0;

  function toggleExpanded(id: string) {
    setExpandedEvents((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function clearFilters() {
    setViewMode("all");
    setAlertFilter("all");
    setSeverityFilter("all");
    setSourceFilter("all");
    setSearch("");
  }

  const showEvents = viewMode === "all" || viewMode === "events";
  const showAlerts = viewMode === "all" || viewMode === "alerts";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
      {/* HEADER */}
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 shadow-xl shadow-cyan-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2.5">
                <Activity className="h-6 w-6 text-cyan-300" />
              </div>

              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-white">
                  CyberLab Activity Center
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Unified events, alerts, response state and security activity.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadActivity(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard
          icon={Activity}
          label="Events"
          value={events.length}
          active={viewMode === "events"}
          onClick={() => setViewMode("events")}
        />

        <StatCard
          icon={Bell}
          label="Alerts"
          value={stats.total ?? alerts.length}
          active={viewMode === "alerts"}
          onClick={() => setViewMode("alerts")}
        />

        <StatCard
          icon={Clock3}
          label="Active"
          value={activeAlerts}
          accent="amber"
          onClick={() => {
            setViewMode("alerts");
            setAlertFilter("pending");
          }}
        />

        <StatCard
          icon={Check}
          label="Ack"
          value={stats.acknowledged ?? 0}
          accent="cyan"
          onClick={() => {
            setViewMode("alerts");
            setAlertFilter("acknowledged");
          }}
        />

        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.resolved ?? 0}
          accent="emerald"
          onClick={() => {
            setViewMode("alerts");
            setAlertFilter("resolved");
          }}
        />

        <StatCard
          icon={XCircle}
          label="Critical"
          value={criticalCount}
          accent="red"
          onClick={() => setSeverityFilter("critical")}
        />

        <StatCard
          icon={CircleAlert}
          label="High"
          value={highCount}
          accent="orange"
          onClick={() => setSeverityFilter("high")}
        />

        <StatCard
          icon={Terminal}
          label="Sources"
          value={sources.length}
          accent="violet"
        />
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Filter className="h-4 w-4 text-cyan-300" />
          Activity Filters
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
            />
          </div>

          <select
            value={viewMode}
            onChange={(event) =>
              setViewMode(event.target.value as ViewMode)
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Activity</option>
            <option value="events">Events Only</option>
            <option value="alerts">Alerts Only</option>
          </select>

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value as SeverityFilter
              )
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>

          <select
            value={alertFilter}
            onChange={(event) =>
              setAlertFilter(
                event.target.value as AlertFilter
              )
            }
            disabled={viewMode === "events"}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <option value="all">All Alert States</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value)
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition hover:text-cyan-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-10 text-center text-sm text-slate-500">
          Loading CyberLab activity...
        </div>
      ) : (
        <div className="space-y-5">
          {/* EVENTS */}
          {showEvents && (
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-300" />
                  <h2 className="font-bold uppercase tracking-wider text-white">
                    Event Timeline
                  </h2>
                </div>

                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-cyan-300">
                  {filteredEvents.length} Events
                </span>
              </div>

              <div className="divide-y divide-slate-800/70">
                {filteredEvents.length === 0 ? (
                  <EmptyState label="No events match the current filters." />
                ) : (
                  filteredEvents.map((event) => {
                    const expanded = expandedEvents.has(event.id);

                    return (
                      <div
                        key={event.id}
                        className="px-5 py-4 transition hover:bg-slate-900/40"
                      >
                        <div className="flex gap-3">
                          <div
                            className={`mt-0.5 rounded-lg border p-2 ${getSeverityClasses(
                              event.severity
                            )}`}
                          >
                            <SeverityIcon severity={event.severity} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-white">
                                    {event.title}
                                  </h3>

                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getSeverityClasses(
                                      event.severity
                                    )}`}
                                  >
                                    {severityConfig[event.severity]?.label ??
                                      event.severity}
                                  </span>
                                </div>

                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                  {event.message}
                                </p>
                              </div>

                              <div className="shrink-0 text-xs text-slate-500">
                                {formatDate(event.timestamp)}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400">
                                Source: {event.source}
                              </span>

                              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400">
                                Type: {event.type}
                              </span>

                              {event.target && (
                                <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-400">
                                  Target: {event.target}
                                </span>
                              )}

                              {event.metadata &&
                                Object.keys(event.metadata).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleExpanded(event.id)
                                    }
                                    className="ml-auto inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-300"
                                  >
                                    {expanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                    Metadata
                                  </button>
                                )}
                            </div>

                            {expanded && event.metadata && (
                              <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[11px] leading-5 text-slate-400">
                                {JSON.stringify(
                                  event.metadata,
                                  null,
                                  2
                                )}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* ALERTS */}
          {showAlerts && (
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-300" />
                  <h2 className="font-bold uppercase tracking-wider text-white">
                    Alert Center
                  </h2>
                </div>

                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-300">
                  {filteredAlerts.length} Alerts
                </span>
              </div>

              <div className="divide-y divide-slate-800/70">
                {filteredAlerts.length === 0 ? (
                  <EmptyState label="No alerts match the current filters." />
                ) : (
                  filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-5 py-4 transition hover:bg-slate-900/40"
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 rounded-lg border p-2 ${getSeverityClasses(
                            alert.severity
                          )}`}
                        >
                          <SeverityIcon severity={alert.severity} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-white">
                                  {alert.source}
                                </span>

                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getSeverityClasses(
                                    alert.severity
                                  )}`}
                                >
                                  {alert.severity}
                                </span>

                                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                                  {alert.status}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-400">
                                Alert ID:{" "}
                                <span className="font-mono text-slate-500">
                                  {alert.id}
                                </span>
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Event:{" "}
                                <span className="font-mono">
                                  {alert.eventId}
                                </span>
                              </p>
                            </div>

                            <div className="text-xs text-slate-500">
                              {formatDate(alert.createdAt)}
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {alert.status === "pending" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatus(
                                    alert.id,
                                    "acknowledged"
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/20"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Acknowledge
                              </button>
                            )}

                            {alert.status !== "resolved" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStatus(
                                    alert.id,
                                    "resolved"
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  active = false,
  accent = "cyan",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  active?: boolean;
  accent?: "cyan" | "amber" | "emerald" | "red" | "orange" | "violet";
  onClick?: () => void;
}) {
  const accents = {
    cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-500/5",
    amber: "text-amber-300 border-amber-500/20 bg-amber-500/5",
    emerald: "text-emerald-300 border-emerald-500/20 bg-emerald-500/5",
    red: "text-red-300 border-red-500/20 bg-red-500/5",
    orange: "text-orange-300 border-orange-500/20 bg-orange-500/5",
    violet: "text-violet-300 border-violet-500/20 bg-violet-500/5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        active
          ? "border-cyan-400/50 bg-cyan-500/10"
          : accents[accent]
      } ${onClick ? "cursor-pointer hover:bg-slate-900/80" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xl font-bold text-white">{value}</span>
      </div>

      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </button>
  );
}
