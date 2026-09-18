import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Network,
  Radar,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  CyberLabAlert,
  ScanRunRecord,
  SystemHealth,
} from "../types";

interface CyberLabHomeProps {
  systemHealth: SystemHealth | null;
  isHealthLoading: boolean;
  scanHistory: ScanRunRecord[];
  onNavigate: (tab: string) => void;
}

interface AlertStats {
  total?: number;
  pending?: number;
  acknowledged?: number;
  resolved?: number;
  bySeverity?: Record<string, number>;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScanType(type: ScanRunRecord["type"]): string {
  switch (type) {
    case "network":
      return "Network scan";
    case "single-host":
      return "Single host";
    case "web":
      return "Web audit";
    case "quick-5s":
      return "Quick scan";
    case "terminal-command":
      return "Terminal";
    default:
      return type;
  }
}

const severityOrder = ["critical", "high", "medium", "low", "info"];

export function CyberLabHome({
  systemHealth,
  isHealthLoading,
  scanHistory,
  onNavigate,
}: CyberLabHomeProps) {
  const [alertStats, setAlertStats] = React.useState<AlertStats>({});
  const [alerts, setAlerts] = React.useState<CyberLabAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = React.useState(true);

  const fetchAlerts = React.useCallback(async () => {
    try {
      setAlertsLoading(true);

      const [statsResponse, alertsResponse] = await Promise.all([
        fetch("/api/ai/alerts/stats", { credentials: "include" }),
        fetch("/api/ai/alerts?limit=8", { credentials: "include" }),
      ]);

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setAlertStats(stats);
      }

      if (alertsResponse.ok) {
        const data = await alertsResponse.json();

        if (Array.isArray(data)) {
          setAlerts(data);
        } else if (Array.isArray(data?.alerts)) {
          setAlerts(data.alerts);
        }
      }
    } catch (error) {
      console.error("CyberLab Home alert fetch error:", error);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAlerts();

    const timer = window.setInterval(fetchAlerts, 15000);

    return () => window.clearInterval(timer);
  }, [fetchAlerts]);

  const severityData = useMemo(() => {
    const source = alertStats.bySeverity || {};

    return severityOrder.map((severity) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: Number(source[severity] || 0),
    }));
  }, [alertStats]);

  const recentScans = useMemo(() => {
    return scanHistory.slice(0, 8);
  }, [scanHistory]);

  const scanChartData = useMemo(() => {
    return scanHistory
      .slice(0, 10)
      .reverse()
      .map((scan) => ({
        name: formatTime(scan.timestamp),
        hosts: Number(scan.hostsFound || 0),
        ports: Number(scan.openPortsTotal || 0),
      }));
  }, [scanHistory]);

  const successfulScans = scanHistory.filter(
    (scan) => scan.status === "success"
  ).length;

  const runningScans = scanHistory.filter(
    (scan) => scan.status === "running"
  ).length;

  const failedScans = scanHistory.filter(
    (scan) => scan.status === "failed"
  ).length;

  const pendingAlerts = Number(alertStats.pending || 0);
  const acknowledgedAlerts = Number(alertStats.acknowledged || 0);
  const resolvedAlerts = Number(alertStats.resolved || 0);

  const availableTools =
    systemHealth?.toolsInstalled?.filter((tool) => tool.available).length || 0;

  const totalTools = systemHealth?.toolsInstalled?.length || 0;

  const memoryPercent = systemHealth?.memory?.usedPercent || 0;
  const cpuPercent = systemHealth?.cpu?.usagePercent || 0;

  const diskPercent = useMemo(() => {
    const disks = systemHealth?.disk || [];

    if (!disks.length) return 0;

    const values = disks
      .map((disk) => Number.parseFloat(disk.usePercent))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return 0;

    return Math.max(...values);
  }, [systemHealth]);

  const systemOnline = Boolean(systemHealth);

  return (
    <section className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
           style={{
             backgroundImage:
               "linear-gradient(rgba(34,211,238,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.8) 1px, transparent 1px)",
             backgroundSize: "32px 32px",
           }}
      />
      {/* ================================================== */}
      {/* COMMAND CENTER HERO */}
      {/* ================================================== */}

      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30 p-6 shadow-2xl shadow-cyan-950/30 ring-1 ring-inset ring-cyan-500/5 lg:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-[0.25em] text-cyan-400">
              <Radar className="h-4 w-4" />
              CYBERLAB COMMAND CENTER
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Security Operations Dashboard
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Unified operational visibility across host telemetry, security
              alerts, vulnerability management, network monitoring and packet
              capture.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 shadow-lg shadow-emerald-950/20">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>

            <div>
              <div className="text-xs font-black tracking-widest text-emerald-300">
                {systemOnline ? "CYBERLAB ONLINE" : "INITIALIZING"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                {systemHealth?.hostname || "Security operations platform"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* OPERATIONAL STATUS */}
      {/* ================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={<Server className="h-5 w-5" />}
          label="SYSTEM HEALTH"
          value={
            isHealthLoading ? "…" : systemOnline ? "ONLINE" : "CHECKING"
          }
          detail={
            systemHealth?.osInfo?.distro ||
            systemHealth?.hostname ||
            "Host telemetry"
          }
          tone={systemOnline ? "emerald" : "amber"}
          onClick={() => onNavigate("home")}
        />

        <StatusCard
          icon={<Activity className="h-5 w-5" />}
          label="ACTIVE SCANS"
          value={String(runningScans)}
          detail={`${successfulScans} successful • ${failedScans} failed`}
          tone={runningScans > 0 ? "cyan" : "blue"}
          onClick={() => onNavigate("network")}
        />

        <StatusCard
          icon={<Bell className="h-5 w-5" />}
          label="PENDING ALERTS"
          value={alertsLoading ? "…" : String(pendingAlerts)}
          detail={`${acknowledgedAlerts} acknowledged • ${resolvedAlerts} resolved`}
          tone={pendingAlerts > 0 ? "amber" : "emerald"}
          onClick={() => onNavigate("alerts")}
        />

        <StatusCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="SECURITY TOOLS"
          value={totalTools ? `${availableTools}/${totalTools}` : "—"}
          detail="Kali tooling detected"
          tone="violet"
          onClick={() => onNavigate("arsenal")}
        />
      </div>

      {/* ================================================== */}
      {/* QUICK OPERATIONS */}
      {/* ================================================== */}

      <Panel
        title="QUICK OPERATIONS"
        subtitle="Launch CyberLab security modules"
        icon={<Zap className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <QuickAction
            label="Network Scanner"
            icon={<Network className="h-5 w-5" />}
            onClick={() => onNavigate("network")}
          />

          <QuickAction
            label="Web Audit"
            icon={<Globe className="h-5 w-5" />}
            onClick={() => onNavigate("web")}
          />

          <QuickAction
            label="Greenbone"
            icon={<ShieldCheck className="h-5 w-5" />}
            onClick={() => onNavigate("greenbone")}
          />

          <QuickAction
            label="Observium"
            icon={<Network className="h-5 w-5" />}
            onClick={() => onNavigate("observium")}
          />

          <QuickAction
            label="TShark"
            icon={<Radar className="h-5 w-5" />}
            onClick={() => onNavigate("tshark")}
          />

          <QuickAction
            label="Terminal"
            icon={<Terminal className="h-5 w-5" />}
            onClick={() => onNavigate("terminal")}
          />

          <QuickAction
            label="Alerts"
            icon={<Bell className="h-5 w-5" />}
            onClick={() => onNavigate("alerts")}
          />

          <QuickAction
            label="Arsenal"
            icon={<Shield className="h-5 w-5" />}
            onClick={() => onNavigate("arsenal")}
          />
        </div>
      </Panel>

      {/* ================================================== */}
      {/* ACTIVITY + ALERT DISTRIBUTION */}
      {/* ================================================== */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          title="SECURITY ACTIVITY"
          subtitle="Recent scan telemetry"
          icon={<Activity className="h-4 w-4" />}
          className="xl:col-span-2"
        >
          <div className="h-72">
            {scanChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scanChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,.10)"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,.2)",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                    }}
                  />

                  <Bar
                    dataKey="hosts"
                    name="Hosts"
                    fill="#22d3ee"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="ports"
                    name="Open Ports"
                    fill="#818cf8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<Activity className="h-8 w-8" />}
                text="No scan history available"
              />
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric label="Successful" value={successfulScans} />
            <Metric label="Running" value={runningScans} />
            <Metric label="Failed" value={failedScans} />
          </div>
        </Panel>

        <Panel
          title="ALERT DISTRIBUTION"
          subtitle="Current Alert Engine state"
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          <div className="h-72">
            {severityData.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {severityData.map((entry, index) => (
                      <Cell
                        key={`severity-${entry.name}`}
                        fill={
                          [
                            "#ef4444",
                            "#f97316",
                            "#eab308",
                            "#22c55e",
                            "#38bdf8",
                          ][index]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,.2)",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<ShieldCheck className="h-8 w-8" />}
                text="No active alert severity data"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Pending" value={pendingAlerts} />
            <Metric label="Ack" value={acknowledgedAlerts} />
            <Metric label="Resolved" value={resolvedAlerts} />
          </div>
        </Panel>
      </div>

      {/* ================================================== */}
      {/* RECENT SCANS + HOST TELEMETRY */}
      {/* ================================================== */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          title="RECENT SECURITY ACTIVITY"
          subtitle="Latest CyberLab operations"
          icon={<CircleDot className="h-4 w-4" />}
        >
          {recentScans.length > 0 ? (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => onNavigate("network")}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-800 border-l-cyan-500/30 bg-slate-950/60 px-3 py-3 text-left shadow-sm transition hover:border-cyan-500/30 hover:bg-slate-900"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      scan.status === "success"
                        ? "bg-emerald-400"
                        : scan.status === "running"
                          ? "bg-cyan-400 animate-pulse"
                          : "bg-red-400"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-200">
                      {formatScanType(scan.type)}
                    </div>

                    <div className="truncate text-[10px] text-slate-500">
                      {scan.target || "No target"} • {scan.hostsFound} hosts •{" "}
                      {scan.openPortsTotal} ports
                    </div>
                  </div>

                  <div className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {formatTime(scan.timestamp)}
                  </div>

                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="h-8 w-8" />}
              text="No recent security activity"
            />
          )}
        </Panel>

        <Panel
          title="HOST TELEMETRY"
          subtitle={`${systemHealth?.hostname || "CyberLabhost"} • LIVE HOST INTELLIGENCE`}
          icon={<Server className="h-4 w-4" />}
        >
          {/* HOST IDENTITY */}
          <div className="rounded-xl border border-cyan-500/15 bg-slate-950/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black tracking-[0.2em] text-cyan-500/70">
                  HOST IDENTITY
                </div>

                <div className="mt-1 truncate text-sm font-black uppercase tracking-wide text-slate-100">
                  {systemHealth?.hostname || "UNKNOWN HOST"}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  {systemHealth?.osInfo?.distro || "Kali GNU/Linux Rolling"}
                  {systemHealth?.osInfo?.release
                    ? ` ${systemHealth.osInfo.release}`
                    : ""}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9px] font-black tracking-widest text-slate-600">
                  UPTIME
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400">
                  {systemHealth?.uptimeFormatted || "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <div className="text-[8px] font-black tracking-widest text-slate-600">
                  KERNEL
                </div>
                <div className="mt-1 truncate text-[10px] font-bold text-slate-300">
                  {systemHealth?.osInfo?.kernel || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <div className="text-[8px] font-black tracking-widest text-slate-600">
                  ARCHITECTURE
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-300">
                  {systemHealth?.osInfo?.arch || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <div className="text-[8px] font-black tracking-widest text-slate-600">
                  SECURITY TOOLS
                </div>
                <div className="mt-1 text-[10px] font-black text-cyan-400">
                  {availableTools}/{totalTools || 0}
                </div>
              </div>
            </div>
          </div>

          {/* RESOURCE TELEMETRY */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TelemetryItem
              label="CPU LOAD"
              value={isHealthLoading ? "…" : `${cpuPercent.toFixed(1)}%`}
              icon={<Cpu className="h-4 w-4" />}
            />

            <TelemetryItem
              label="RAM USAGE"
              value={isHealthLoading ? "…" : `${memoryPercent.toFixed(1)}%`}
              icon={<Database className="h-4 w-4" />}
            />

            <TelemetryItem
              label="ROOT DISK (/)"
              value={`${diskPercent.toFixed(1)}%`}
              icon={<HardDrive className="h-4 w-4" />}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-cyan-500/20">
              <div className="text-[9px] font-black tracking-widest text-slate-600">
                CPU DETAILS
              </div>
              <div className="mt-1 text-xs font-bold text-slate-300">
                {systemHealth?.cpu?.cores || "—"} Cores
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Load:{" "}
                {systemHealth?.cpu?.loadAverage
                  ?.map((value) => value.toFixed(2))
                  .join(", ") || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-cyan-500/20">
              <div className="text-[9px] font-black tracking-widest text-slate-600">
                MEMORY DETAILS
              </div>
              <div className="mt-1 text-xs font-bold text-slate-300">
                {systemHealth?.memory
                  ? `${(
                      systemHealth.memory.usedBytes /
                      1024 /
                      1024 /
                      1024
                    ).toFixed(1)} GB / ${(
                      systemHealth.memory.totalBytes /
                      1024 /
                      1024 /
                      1024
                    ).toFixed(1)} GB`
                  : "—"}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {memoryPercent.toFixed(1)}% utilized
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-colors hover:border-cyan-500/20">
              <div className="text-[9px] font-black tracking-widest text-slate-600">
                ROOT DISK DETAILS
              </div>
              <div className="mt-1 text-xs font-bold text-slate-300">
                {systemHealth?.disk?.[0]
                  ? `${systemHealth.disk[0].used} / ${systemHealth.disk[0].size}`
                  : "—"}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {systemHealth?.disk?.[0]?.avail || "—"} free
              </div>
            </div>
          </div>

          {/* LIVE UTILIZATION */}
          <div className="mt-4 space-y-3">
            <ProgressBar label="CPU UTILIZATION" value={cpuPercent} />
            <ProgressBar label="MEMORY UTILIZATION" value={memoryPercent} />
            <ProgressBar label="DISK UTILIZATION" value={diskPercent} />
          </div>

          {/* NETWORK TELEMETRY */}
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black tracking-[0.2em] text-slate-600">
                  NETWORK TELEMETRY
                </div>
                <div className="mt-1 text-xs font-bold text-slate-300">
                  Live host network surface
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9px] font-black tracking-widest text-slate-600">
                  ACTIVE SOCKETS
                </div>
                <div className="mt-1 text-sm font-black text-cyan-400">
                  {systemHealth?.listeningSockets?.length || 0}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <div className="text-[8px] font-black tracking-widest text-slate-600">
                  LISTENING PORTS
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(systemHealth?.listeningSockets || [])
                    .slice(0, 12)
                    .map((socket, index) => (
                      <span
                        key={`${socket.protocol}-${socket.localPort}-${index}`}
                        className="rounded-md border border-cyan-500/15 bg-cyan-500/5 px-2 py-1 font-mono text-[9px] font-bold text-cyan-300"
                      >
                        :{socket.localPort}
                      </span>
                    ))}

                  {!systemHealth?.listeningSockets?.length && (
                    <span className="text-[10px] text-slate-600">
                      No listening sockets detected
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <div className="text-[8px] font-black tracking-widest text-slate-600">
                  EXTERNAL INTERFACES
                </div>

                <div className="mt-2 space-y-1.5">
                  {(systemHealth?.interfaces || [])
                    .filter((iface) => !iface.internal)
                    .map((iface) => (
                      <div
                        key={`${iface.name}-${iface.ip}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-800/80 bg-slate-950/50 px-2 py-1.5"
                      >
                        <span className="font-mono text-[9px] font-bold text-slate-400">
                          {iface.name}
                        </span>
                        <span className="truncate font-mono text-[9px] text-cyan-300">
                          {iface.ip}
                        </span>
                      </div>
                    ))}

                  {!systemHealth?.interfaces?.some((iface) => !iface.internal) && (
                    <span className="text-[10px] text-slate-600">
                      No external interfaces detected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HOST BINARY MATRIX */}
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black tracking-[0.2em] text-slate-600">
                  HOST BINARY MATRIX
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Detected security and network command-line tooling
                </div>
              </div>

              <div className="text-[10px] font-black text-emerald-400">
                {availableTools}/{totalTools || 0} ONLINE
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(systemHealth?.toolsInstalled || [])
                .filter((tool) => tool.available)
                .map((tool) => (
                  <span
                    key={`${tool.name}-${tool.command}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/15 bg-emerald-500/5 px-2 py-1 font-mono text-[9px] font-bold text-emerald-300"
                    title={tool.version || tool.path || tool.command}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {tool.command || tool.name}
                  </span>
                ))}

              {!systemHealth?.toolsInstalled?.some((tool) => tool.available) && (
                <span className="text-[10px] text-slate-600">
                  Tool inventory unavailable
                </span>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* ================================================== */}
      {/* SECURITY INTEGRATIONS */}
      {/* ================================================== */}

      <Panel
        title="SECURITY INTEGRATIONS"
        subtitle="Connected CyberLab operational modules"
        icon={<Shield className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntegrationRow
            icon={<ShieldCheck className="h-4 w-4" />}
            name="Greenbone / OpenVAS"
            detail="Vulnerability management"
            status="READY"
            onClick={() => onNavigate("greenbone")}
          />

          <IntegrationRow
            icon={<Network className="h-4 w-4" />}
            name="Observium"
            detail="Network monitoring"
            status="READY"
            onClick={() => onNavigate("observium")}
          />

          <IntegrationRow
            icon={<Radar className="h-4 w-4" />}
            name="TShark"
            detail="Packet capture engine"
            status="READY"
            onClick={() => onNavigate("tshark")}
          />

          <IntegrationRow
            icon={<Terminal className="h-4 w-4" />}
            name="Kali Security Tools"
            detail={
              totalTools
                ? `${availableTools}/${totalTools} detected`
                : "Tool inventory available"
            }
            status={totalTools ? "READY" : "CHECK"}
            onClick={() => onNavigate("arsenal")}
          />
        </div>
      </Panel>

      {/* ================================================== */}
      {/* RECENT ALERTS */}
      {/* ================================================== */}

      <Panel
        title="RECENT SECURITY ALERTS"
        subtitle="Alert Engine activity"
        icon={<AlertTriangle className="h-4 w-4" />}
      >
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.slice(0, 6).map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => onNavigate("alerts")}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-800 border-l-cyan-500/30 bg-slate-950/60 px-3 py-3 text-left shadow-sm transition hover:border-cyan-500/30 hover:bg-slate-900"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    alert.severity === "critical"
                      ? "bg-red-500"
                      : alert.severity === "high"
                        ? "bg-orange-500"
                        : alert.severity === "medium"
                          ? "bg-yellow-400"
                          : alert.severity === "low"
                            ? "bg-emerald-400"
                            : "bg-cyan-400"
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-200">
                    {alert.title}
                  </div>

                  <div className="truncate text-[10px] text-slate-500">
                    {alert.source} • {alert.target || "No target"}
                  </div>
                </div>

                <div className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {formatTime(alert.createdAt)}
                </div>

                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8" />}
            text="No recent security alerts"
          />
        )}
      </Panel>
    </section>
  );
}

function StatusCard({
  icon,
  label,
  value,
  detail,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "violet" | "amber" | "emerald" | "blue";
  onClick?: () => void;
}) {
  const toneClasses = {
    cyan: "border-cyan-500/20 text-cyan-300",
    violet: "border-violet-500/20 text-violet-300",
    amber: "border-amber-500/20 text-amber-300",
    emerald: "border-emerald-500/20 text-emerald-300",
    blue: "border-blue-500/20 text-blue-300",
  };

  return (
    <button
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border bg-slate-900/75 p-4 text-left shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cyan-950/20 ${toneClasses[tone]} ${
        onClick
          ? "cursor-pointer transition hover:border-cyan-400/40 hover:bg-slate-900"
          : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>{icon}</div>

        <span className="text-[9px] font-black tracking-widest text-slate-600">
          LIVE
        </span>
      </div>

      <div className="mt-4 text-[10px] font-bold tracking-widest text-slate-500">
        {label}
      </div>

      <div className="mt-1 truncate text-2xl font-black text-white">
        {value}
      </div>

      <div className="mt-1 truncate text-[10px] text-slate-500">
        {detail}
      </div>
    </button>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-xl shadow-black/20 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-300">
            <span className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-1.5 text-cyan-400">{icon}</span>
            {title}
          </div>

          <div className="mt-1 text-[10px] text-slate-600">
            {subtitle}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 transition-colors hover:border-cyan-500/20">
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-sm font-black text-slate-200">
        {value}
      </div>
    </div>
  );
}

function TelemetryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 shadow-sm transition-colors hover:border-emerald-500/20 hover:bg-slate-900">
      <div className="flex items-center gap-2 text-[9px] font-black tracking-widest text-slate-600">
        <span className="text-cyan-500/70">{icon}</span>
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-black text-slate-300">
        {value}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div>
      <div className="mb-2 flex justify-between text-[9px] font-black tracking-widest text-slate-600">
        <span>{label}</span>
        <span>{safeValue.toFixed(1)}%</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.45)] transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function IntegrationRow({
  icon,
  name,
  detail,
  status,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  detail: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 shadow-sm transition-colors hover:border-emerald-500/20 hover:bg-slate-900 text-left transition hover:border-cyan-500/30 hover:bg-slate-900"
    >
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-cyan-400">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-slate-200">
          {name}
        </div>

        <div className="truncate text-[10px] text-slate-600">
          {detail}
        </div>
      </div>

      <span className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[9px] font-black tracking-widest text-emerald-400">
        {status}
      </span>
    </button>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition hover:border-cyan-500/30 hover:bg-cyan-500/5"
    >
      <span className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-1.5 text-cyan-400">{icon}</span>

      <span className="text-[10px] font-bold tracking-wider text-slate-400">
        {label}
      </span>
    </button>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-6 text-slate-600">
      {icon}
      <span className="text-xs">{text}</span>
    </div>
  );
}
