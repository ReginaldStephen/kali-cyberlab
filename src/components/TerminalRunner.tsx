import React, { useState } from "react";
import { TerminalExecutionResponse } from "../types";
import { 
  Terminal, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2,
  Copy,
  Check
} from "lucide-react";

interface TerminalRunnerProps {
  onExecCommand: (command: string) => Promise<TerminalExecutionResponse | null>;
  isLoading: boolean;
}

export const TerminalRunner: React.FC<TerminalRunnerProps> = ({
  onExecCommand,
  isLoading,
}) => {
  const [commandInput, setCommandInput] = useState("ss -tuln");
  const [history, setHistory] = useState<TerminalExecutionResponse[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const presetCommands = [
    { label: "Active Sockets", cmd: "ss -tuln" },
    { label: "Network Interfaces", cmd: "ip addr" },
    { label: "Ping Loopback", cmd: "ping -c 3 127.0.0.1" },
    { label: "Quick Local Nmap", cmd: "nmap -T4 -F 127.0.0.1" },
    { label: "Disk Space (df)", cmd: "df -h" },
    { label: "Memory (free)", cmd: "free -m" },
    { label: "Host Kernel (uname)", cmd: "uname -a" },
    { label: "System Uptime", cmd: "uptime" },
  ];

  const handleExecute = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || commandInput).trim();
    if (!cmd) return;

    const res = await onExecCommand(cmd);
    if (res) {
      setHistory((prev) => [res, ...prev.slice(0, 15)]);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Terminal Input Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Interactive Kali Linux Diagnostic Terminal
            </h2>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-500">
            DIRECT TERMINAL EXECUTION ON KALI HOST
          </span>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3 items-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mr-1">QUICK PRESETS:</span>
          {presetCommands.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setCommandInput(preset.cmd);
                handleExecute(preset.cmd);
              }}
              className="rounded bg-slate-950 px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Command Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecute();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-400 text-xs font-bold">
              kali@server:~$
            </div>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="e.g. ss -tuln, ping -c 3 127.0.0.1, nmap -F localhost, df -h"
              className="w-full rounded border border-slate-700 bg-slate-950 py-2.5 pl-32 pr-4 text-xs text-emerald-400 placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-emerald-500 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin text-white" />
                <span>RUNNING...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current text-white" />
                <span>EXECUTE COMMAND</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Terminal History / Outputs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">
            TERMINAL EXECUTION HISTORY ({history.length} RUNS):
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> CLEAR CONSOLE
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
            <Terminal className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              No Commands Executed Yet
            </h3>
            <p className="mt-1 text-[11px] text-slate-600 max-w-md mx-auto">
              Select a quick preset above or type any diagnostic command (e.g. ss, nmap, ping, ip, uptime) to run on your server.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-950 text-xs shadow-md overflow-hidden"
            >
              {/* Terminal Title Bar */}
              <div className="flex items-center justify-between bg-slate-900/90 px-3.5 py-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500/80" />
                    <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                    <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] text-white font-bold ml-1">
                    $ {item.commandRun}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <Clock className="h-2.5 w-2.5" />
                    {item.executionTimeMs}ms
                  </span>

                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] uppercase font-bold border ${
                    item.exitCode === 0
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-600/10 text-red-400 border-red-600/20"
                  }`}>
                    {item.exitCode === 0 ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : (
                      <XCircle className="h-2.5 w-2.5" />
                    )}
                    EXIT {item.exitCode}
                  </span>

                  <button
                    onClick={() => copyToClipboard(item.stdout || item.stderr, idx)}
                    title="Copy command output"
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terminal Stdout / Stderr Content */}
              <div className="p-3.5 max-h-72 overflow-y-auto bg-black/40">
                {item.stdout && (
                  <pre className="text-emerald-400/95 whitespace-pre-wrap leading-relaxed text-[11px]">
                    {item.stdout}
                  </pre>
                )}
                {item.stderr && (
                  <pre className="text-red-400 whitespace-pre-wrap leading-relaxed text-[11px] mt-1 border-t border-red-900/30 pt-1">
                    {item.stderr}
                  </pre>
                )}
                {!item.stdout && !item.stderr && (
                  <span className="text-slate-600 italic text-[11px]">
                    (Command exited with no output)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
