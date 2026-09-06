import React, { useState } from "react";
import { DiscoveredHost, ScanRunRecord } from "../types";
import {
  Search,
  Terminal,
  Server,
  ShieldAlert,
  Zap,
  Clock,
  AlertTriangle,
  Play,
  RotateCw,
  Sliders,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface NetworkScannerProps {
  onRunScan: (target: string, scanType: string, ports: number[]) => Promise<void>;
  isLoading: boolean;
  discoveredHosts: DiscoveredHost[];
  latestScanRecord: ScanRunRecord | null;
  onGenerateReport: (scanId: string) => Promise<void>;
  isReportLoading?: boolean;
  onSelectHostForAudit?: (ip: string) => void;
}

export const NetworkScanner: React.FC<NetworkScannerProps> = ({
  onRunScan,
  isLoading,
  discoveredHosts,
  latestScanRecord,
  onGenerateReport,
  isReportLoading = false,
  onSelectHostForAudit,
}) => {
  const [targetInput, setTargetInput] = useState("127.0.0.1");
  const [scanType, setScanType] = useState<"quick" | "full" | "ping-sweep" | "custom">("quick");
  const [customPortsInput, setCustomPortsInput] = useState("21, 22, 23, 80, 443, 3000, 3306, 6379, 8080");
  const [showRawTerminal, setShowRawTerminal] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    let ports: number[] = [];
    if (scanType === "custom" && customPortsInput) {
      ports = customPortsInput
        .split(/[, ]+/)
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p) && p > 0 && p <= 65535);
    }

    onRunScan(targetInput.trim(), scanType, ports);
  };

  const totalOpenPorts = discoveredHosts.reduce((acc, h) => acc + h.openPorts.length, 0);

  return (
    <div className="space-y-4 font-mono">
      {/* Target & Scan Configuration Panel */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Search className="h-4 w-4 text-emerald-400" />
                Network Reconnaissance & Subnet Scanner
              </h2>
              <p className="text-[10px] uppercase text-slate-500 mt-0.5">
                EXECUTE LIVE KALI LINUX COMMANDS (NMAP / SOCKET SWEEP) AGAINST TARGET IP, RANGES, OR SUBNETS
              </p>
            </div>

            {/* Quick Profile Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "quick", label: "QUICK TOP PORTS" },
                { id: "full", label: "NMAP DEEP (-sV)" },
                { id: "ping-sweep", label: "PING SWEEP (-sn)" },
                { id: "custom", label: "CUSTOM PORTS" },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setScanType(p.id as any)}
                  className={`rounded px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${
                    scanType === p.id
                      ? "bg-slate-800 text-white border border-slate-600"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* IP Target Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-[10px] uppercase font-bold">
                TARGET:
              </div>
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="127.0.0.1 or 192.168.1.1-20 or 10.0.0.0/24 or domain.com"
                className="w-full rounded border border-slate-700 bg-slate-950 py-2.5 pl-20 pr-4 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Scan Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-emerald-500 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin text-white" />
                  <span>EXECUTING SCAN...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-white" />
                  <span>INITIALIZE SCAN</span>
                </>
              )}
            </button>
          </div>

          {/* Custom Port input if custom profile selected */}
          {scanType === "custom" && (
            <div className="flex items-center gap-2 rounded bg-slate-950 p-2.5 border border-slate-800">
              <Sliders className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 block font-bold">
                  CUSTOM TARGET PORTS (COMMA-SEPARATED):
                </label>
                <input
                  type="text"
                  value={customPortsInput}
                  onChange={(e) => setCustomPortsInput(e.target.value)}
                  placeholder="21, 22, 80, 443, 3306, 8080"
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Header / Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-4 text-[11px] uppercase text-slate-400">
          <span>
            DISCOVERED HOSTS: <span className="font-bold text-white">{discoveredHosts.length}</span>
          </span>
          <span>
            TOTAL OPEN PORTS: <span className="font-bold text-emerald-400">{totalOpenPorts}</span>
          </span>
          {latestScanRecord && (
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3" />
              <span>LATENCY: {latestScanRecord.durationMs}ms</span>
            </span>
          )}
        </div>

       {latestScanRecord && (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => onGenerateReport(latestScanRecord.id)}
      disabled={isReportLoading}
      className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold border border-emerald-500/30 bg-emerald-600/10 text-emerald-400 transition-all hover:bg-emerald-600/20 hover:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      <span>
        {isReportLoading
          ? "GENERATING REPORT..."
          : "VIEW REPORT"}
      </span>
    </button>

    <button
      type="button"
      onClick={() => setShowRawTerminal(!showRawTerminal)}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold border transition-all ${
        showRawTerminal
          ? "bg-slate-800 text-emerald-400 border-slate-700"
          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
      }`}
    >
      <Terminal className="h-3.5 w-3.5" />
      <span>
        {showRawTerminal ? "HIDE RAW OUTPUT" : "LIVE SCAN OUTPUT"}
      </span>
    </button>
  </div>
)}
      </div>

      {/* Raw Terminal stdout viewer */}
      {showRawTerminal && latestScanRecord && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3.5 py-2 text-slate-400 text-[10px] uppercase font-bold">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              EXECUTING: <code className="text-emerald-400 lowercase">{latestScanRecord.commandExecuted}</code>
            </span>
            <span>STATUS: <span className="text-emerald-400">{latestScanRecord.status.toUpperCase()}</span></span>
          </div>
          <div className="p-3.5 bg-black/40 text-emerald-500/90 leading-relaxed text-[11px]">
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap">
              {latestScanRecord.rawTerminalOutput || "[*] Waiting for server response..."}
            </pre>
            <div className="mt-2 flex items-center gap-1 text-emerald-400/70">
              <span className="w-2 h-3.5 bg-emerald-500/50" />
              <span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      )}

      {/* Discovered Hosts Cards Grid */}
      {discoveredHosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <Server className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Awaiting Live Scan Execution
          </h3>
          <p className="mt-1 text-[11px] text-slate-600 max-w-md mx-auto">
            No figures or data are pre-populated. Enter your target IP or range above and click &apos;INITIALIZE SCAN&apos; to execute a live scan from your server.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {discoveredHosts.map((host) => (
            <div
              key={host.ip}
              className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition-all hover:border-slate-700 shadow-sm"
            >
              {/* Host Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="text-sm font-bold text-white tracking-wide">
                      {host.ip}
                    </span>
                    {host.hostname && (
                      <span className="ml-2 text-xs text-slate-400">
                        ({host.hostname})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-400 border border-slate-800">
                    STATUS: <span className="text-emerald-400">{host.status.toUpperCase()}</span>
                  </span>
                  {typeof host.latencyMs === "number" && (
                    <span className="text-[10px] text-slate-500">
                      {host.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Discovered Ports List */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 mb-2 font-bold tracking-wider">
                  <span>DETECTED SERVICE INVENTORY:</span>
                  <span className="text-emerald-400">{host.openPorts.length} OPEN</span>
                </div>

                {host.openPorts.length === 0 ? (
                  <div className="rounded bg-slate-950 p-3 text-center text-[11px] text-slate-600 border border-slate-800/60">
                    No open standard ports detected in this probe.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">

                 

                  </div>
                )}
              </div>

              {/* Host actions */}
              {onSelectHostForAudit && (
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-end">
                  <button
                    onClick={() => onSelectHostForAudit(host.ip)}
                    className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    AUDIT WEB POSTURE ON {host.ip} →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
