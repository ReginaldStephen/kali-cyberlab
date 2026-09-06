import React from "react";
import { ScanRunRecord } from "../types";
import { 
  X, 
  Trash2, 
  Terminal, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Globe, 
  Radio
} from "lucide-react";

interface ScanHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScanRunRecord[];
  onClearHistory: () => Promise<void>;
  onGenerateReport: (scanId: string) => Promise<void>;
  isReportLoading?: boolean;
}

export const ScanHistoryDrawer: React.FC<ScanHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onGenerateReport,
  isReportLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs font-mono">
      <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl text-xs">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-900">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Scan & Terminal Run Logs ({history.length})
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1 rounded bg-slate-950 px-2.5 py-1 text-[10px] uppercase font-bold text-red-400 border border-slate-800 hover:bg-red-950/40 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> CLEAR
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
              No live scan logs captured yet. Execute a network scan or enable the 5s auto-scan to stream telemetry.
            </div>
          ) : (
            history.map((record) => {
              const is5sTick = record.type === "quick-5s";
              const isWeb = record.type === "web";
              const isCmd = record.type === "terminal-command";

              return (
                <div
                  key={record.id}
                  className="rounded-lg bg-slate-900 p-3 border border-slate-800 space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-bold text-white uppercase">
                      {is5sTick ? (
                        <Radio className="h-3 w-3 text-emerald-400" />
                      ) : isWeb ? (
                        <Globe className="h-3 w-3 text-cyan-400" />
                      ) : isCmd ? (
                        <Terminal className="h-3 w-3 text-purple-400" />
                      ) : (
                        <Activity className="h-3 w-3 text-blue-400" />
                      )}
                      {record.type} • {record.target}
                    </span>

                    <span className="text-slate-500 text-[10px] font-bold">
                      {new Date(record.timestamp).toLocaleTimeString()} ({record.durationMs}ms)
                    </span>
                  </div>
                                   <div className="text-[11px] text-emerald-400 font-mono truncate font-bold">
                    $ {record.commandExecuted}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                      <span>
                        HOSTS: {record.hostsFound} • PORTS OPEN: {record.openPortsTotal}
                      </span>

                      <span
                        className={
                          record.status === "success"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        [{record.status.toUpperCase()}]
                      </span>
                    </div>

                    {record.status === "success" && (
                      <button
                        type="button"
                        onClick={() => onGenerateReport(record.id)}
                        disabled={isReportLoading}
                        className="w-full flex items-center justify-center gap-2 rounded bg-emerald-600/10 border border-emerald-500/30 px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-emerald-400 hover:bg-emerald-600/20 hover:border-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isReportLoading
                          ? "GENERATING EXECUTIVE REPORT..."
                          : "GENERATE EXECUTIVE REPORT"}
                      </button>
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
};
