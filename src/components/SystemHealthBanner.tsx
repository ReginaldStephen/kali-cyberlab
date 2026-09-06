import React from "react";
import { SystemHealth } from "../types";
import { 
  Cpu, 
  HardDrive, 
  Network, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Terminal,
  Zap,
  Layers
} from "lucide-react";

interface SystemHealthBannerProps {
  health: SystemHealth | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const SystemHealthBanner: React.FC<SystemHealthBannerProps> = ({
  health,
  isLoading,
  onRefresh,
}) => {
  if (!health && isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
          <span className="uppercase text-[11px] tracking-wider">Executing Linux Host Telemetry Diagnostics (uname, df, free, ss)...</span>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4 text-red-300 flex items-center justify-between">
        <div className="text-xs font-mono uppercase tracking-wider">
          [!] Awaiting connection to host terminal backend. Click refresh to query host.
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-600/30 font-mono uppercase font-bold"
        >
          <RefreshCw className="h-3 w-3" />
          Query Host
        </button>
      </div>
    );
  }

  const primaryDisk = health.disk?.[0] || { size: "0", used: "0", usePercent: "0%" };
  const installedToolsCount = health.toolsInstalled.filter((t) => t.available).length;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
      {/* Header telemetry stripe */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 p-3.5">
        {/* Host identity */}
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                {health.osInfo.distro}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                KERNEL: {health.osInfo.kernel} ({health.osInfo.arch})
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
              UPTIME: <span className="text-slate-200 font-semibold">{health.uptimeFormatted}</span> • HOSTNAME: <span className="text-emerald-400 font-semibold">{health.hostname}</span>
            </p>
          </div>
        </div>

        {/* Live tool status count & refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded bg-slate-950 px-2.5 py-1 text-[11px] font-mono border border-slate-800 text-slate-300">
            <Terminal className="h-3 w-3 text-emerald-400" />
            <span className="text-slate-500 uppercase text-[10px]">SECURITY TOOLS:</span>
            <span className="font-bold text-emerald-400">{installedToolsCount}/{health.toolsInstalled.length}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Re-run host telemetry commands"
            className="flex items-center gap-1 rounded border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-mono text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span className="uppercase text-[10px] font-bold">POLL</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        
        {/* CPU Load */}
        <div className="rounded bg-slate-950 p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-emerald-400" /> CPU LOAD
            </span>
            <span className="text-white font-bold">{health.cpu.usagePercent}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, health.cpu.usagePercent)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[9px] font-mono uppercase text-slate-500 truncate">
            {health.cpu.cores} Cores | Load: {health.cpu.loadAverage.map(n => n.toFixed(2)).join(", ")}
          </p>
        </div>

        {/* Memory */}
        <div className="rounded bg-slate-950 p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-blue-400" /> RAM USAGE
            </span>
            <span className="text-white font-bold">{health.memory.usedPercent}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, health.memory.usedPercent)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[9px] font-mono uppercase text-slate-500 truncate">
            {(health.memory.usedBytes / (1024 * 1024 * 1024)).toFixed(1)}GB / {(health.memory.totalBytes / (1024 * 1024 * 1024)).toFixed(1)}GB
          </p>
        </div>

        {/* Disk */}
        <div className="rounded bg-slate-950 p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-orange-400" /> ROOT DISK (/)
            </span>
            <span className="text-white font-bold">{primaryDisk.usePercent}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: primaryDisk.usePercent }}
            />
          </div>
          <p className="mt-1.5 text-[9px] font-mono uppercase text-slate-500 truncate">
            {primaryDisk.used} / {primaryDisk.size} ({primaryDisk.avail} Free)
          </p>
        </div>

        {/* Listening Sockets (from ss -tuln) */}
        <div className="rounded bg-slate-950 p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-purple-400" /> ACTIVE SOCKETS
            </span>
            <span className="text-white font-bold">{health.listeningSockets.length}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, health.listeningSockets.length * 10)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[9px] font-mono uppercase text-slate-500 truncate">
            {health.listeningSockets.slice(0, 3).map(s => `:${s.localPort}`).join(" ") || "No active sockets"}
          </p>
        </div>

        {/* Network Interfaces */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded bg-slate-950 p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1">
              <Network className="h-3 w-3 text-cyan-400" /> INTERFACES
            </span>
            <span className="text-white font-bold">{health.interfaces.filter(i => !i.internal).length} EXT</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: "100%" }}
            />
          </div>
          <p className="mt-1.5 text-[9px] font-mono uppercase text-slate-500 truncate">
            {health.interfaces.filter(i => !i.internal)[0]?.ip || "127.0.0.1"} ({health.interfaces[0]?.name || "lo"})
          </p>
        </div>

      </div>

      {/* Installed Tools Badges */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5 border-t border-slate-800/60 pt-2.5">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold mr-1">HOST BINARY MATRIX:</span>
        {health.toolsInstalled.map((tool) => (
          <span
            key={tool.name}
            title={tool.version || tool.command}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono border ${
              tool.available
                ? "bg-slate-950 text-slate-300 border-slate-800"
                : "bg-slate-950 text-slate-600 border-slate-850 line-through"
            }`}
          >
            {tool.available ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
            <span className={tool.available ? "text-slate-300" : "text-slate-600"}>{tool.command}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
