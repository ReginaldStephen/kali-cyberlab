import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type EventSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

interface CyberLabEvent {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  severity: EventSeverity;
  title: string;
  message: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

interface ActivityLogProps {
  onBack?: () => void;
}

const severityConfig: Record<
  EventSeverity,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
    border: string;
  }
> = {
  critical: {
    label: "Critical",
    icon: ShieldAlert,
    badge:
      "bg-red-500/15 text-red-300 border-red-500/30",
    border: "border-red-500/30",
  },
  high: {
    label: "High",
    icon: CircleAlert,
    badge:
      "bg-orange-500/15 text-orange-300 border-orange-500/30",
    border: "border-orange-500/30",
  },
  medium: {
    label: "Medium",
    icon: AlertTriangle,
    badge:
      "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "border-amber-500/30",
  },
  low: {
    label: "Low",
    icon: Info,
    badge:
      "bg-blue-500/15 text-blue-300 border-blue-500/30",
    border: "border-blue-500/30",
  },
  info: {
    label: "Info",
    icon: CheckCircle2,
    badge:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    border: "border-emerald-500/30",
  },
};

const filters: Array<"all" | EventSeverity> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export const ActivityLog: React.FC<ActivityLogProps> = () => {
  const [events, setEvents] = useState<CyberLabEvent[]>([]);
  const [filter, setFilter] =
    useState<"all" | EventSeverity>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/ai/events?limit=200",
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Authentication required. Please sign in again."
            );
          }

          throw new Error(
            `Unable to load CyberLab events (${response.status}).`
          );
        }

        const data = await response.json();

        setEvents(
          Array.isArray(data.events)
            ? data.events
            : []
        );
      } catch (err: any) {
        console.error(
          "Activity log error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load CyberLab activity."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") {
      return events;
    }

    return events.filter(
      (event) => event.severity === filter
    );
  }, [events, filter]);

  const counts = useMemo(() => {
    return {
      all: events.length,
      critical: events.filter(
        (event) => event.severity === "critical"
      ).length,
      high: events.filter(
        (event) => event.severity === "high"
      ).length,
      medium: events.filter(
        (event) => event.severity === "medium"
      ).length,
      low: events.filter(
        (event) => event.severity === "low"
      ).length,
      info: events.filter(
        (event) => event.severity === "info"
      ).length,
    };
  }, [events]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString();
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold uppercase tracking-wider text-white">
                  CyberLab Activity Log
                </h2>

                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Live Events
                </span>
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                Central security event stream for CyberLab
                operations, scanners, monitoring systems,
                and future alerting services.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadEvents(true)}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
            {isRefreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </div>

      {/* Severity filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((severity) => {
            const isActive = filter === severity;
            const count =
              counts[severity];

            const label =
              severity === "all"
                ? "All"
                : severityConfig[severity].label;

            return (
              <button
                key={severity}
                onClick={() => setFilter(severity)}
                className={`rounded border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  isActive
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-emerald-400" />
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Loading CyberLab activity...
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading &&
        !error &&
        filteredEvents.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
            <Activity className="mx-auto mb-3 h-8 w-8 text-slate-700" />

            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              No events found
            </p>

            <p className="mt-2 text-xs text-slate-600">
              CyberLab activity will appear here as
              security operations occur.
            </p>
          </div>
        )}

      {/* Event list */}
      {!isLoading &&
        filteredEvents.length > 0 && (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const config =
                severityConfig[event.severity] ||
                severityConfig.info;

              const Icon = config.icon;

              return (
                <article
                  key={event.id}
                  className={`rounded-xl border bg-slate-900/60 p-4 transition hover:bg-slate-900 ${config.border}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${config.badge}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {event.title}
                          </h3>

                          <span
                            className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${config.badge}`}
                          >
                            {config.label}
                          </span>
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                          {event.message}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-slate-600">
                          <span>
                            SOURCE:{" "}
                            <strong className="text-slate-400">
                              {event.source}
                            </strong>
                          </span>

                          <span>
                            TYPE:{" "}
                            <strong className="text-slate-400">
                              {event.type}
                            </strong>
                          </span>

                          {event.target && (
                            <span>
                              TARGET:{" "}
                              <strong className="text-slate-400">
                                {event.target}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-left text-[10px] uppercase tracking-wider text-slate-600 lg:text-right">
                      <div>
                        {formatTimestamp(
                          event.timestamp
                        )}
                      </div>
                      <div className="mt-1 text-slate-700">
                        {event.id}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </section>
  );
};

export default ActivityLog;
