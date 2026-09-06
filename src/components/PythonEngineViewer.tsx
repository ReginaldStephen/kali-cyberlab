import React, { useState, useEffect } from "react";
import {
  Code,
  Terminal,
  Download,
  Copy,
  Check,
  Play,
  RotateCw,
  Cpu,
  Database,
  Radio,
  FileCode,
  ExternalLink,
  ShieldCheck,
  Layers
} from "lucide-react";

interface PythonFile {
  name: string;
  framework: string;
  description: string;
  content: string;
}

export const PythonEngineViewer: React.FC = () => {
  const [pythonFiles, setPythonFiles] = useState<PythonFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("app.py");
  const [liveTelemetry, setLiveTelemetry] = useState<any>(null);
  const [isFetchingTelemetry, setIsFetchingTelemetry] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Custom Python REPL / Execution
  const [customCode, setCustomCode] = useState<string>(
`# Live Python Diagnostic Snippet
import os, sys, socket, subprocess

print("=== Python Host Diagnostics ===")
print("Python Version:", sys.version.split()[0])
print("Hostname:", socket.gethostname())
print("CPU Load Avg:", os.getloadavg())

# Check sockets using ss
res = subprocess.run(["ss", "-tuln"], capture_output=True, text=True)
print("\\nActive Listening Sockets:")
print(res.stdout[:400] if res.stdout else "No sockets output")
`
  );
  const [execResult, setExecResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch Python source files on mount
  useEffect(() => {
    fetchPythonFiles();
    fetchLivePythonTelemetry();
  }, []);

  const fetchPythonFiles = async () => {
    try {
      const res = await fetch("/api/python/code");
      if (res.ok) {
        const data = await res.json();
        setPythonFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to load python files:", e);
    }
  };

  const fetchLivePythonTelemetry = async () => {
    setIsFetchingTelemetry(true);
    try {
      const res = await fetch("/api/python/telemetry");
      if (res.ok) {
        const data = await res.json();
        setLiveTelemetry(data);
      }
    } catch (e) {
      console.error("Failed to fetch python telemetry:", e);
    } finally {
      setIsFetchingTelemetry(false);
    }
  };

  const handleRunPython = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch("/api/python/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: customCode }),
      });
      const data = await res.json();
      setExecResult(data);
    } catch (e: any) {
      setExecResult({ stderr: e.message || "Failed to execute Python", exitCode: 1 });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedFile = pythonFiles.find((f) => f.name === selectedFileName) || pythonFiles[0];

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                Python Flask & Django CyberLab Architecture
              </h2>
              <p className="text-[10px] uppercase text-slate-500 mt-0.5">
                NO SIMULATED OR ASSUMED DATA • DIRECT LINUX KERNEL /PROC, SS, AND SOCKET IMPLEMENTATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLivePythonTelemetry}
              disabled={isFetchingTelemetry}
              className="flex items-center gap-1.5 rounded bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className={`h-3 w-3 ${isFetchingTelemetry ? "animate-spin text-emerald-400" : ""}`} />
              <span>{isFetchingTelemetry ? "Reading Kernel..." : "Refresh Python Telemetry"}</span>
            </button>
          </div>
        </div>

        {/* Live Python Kernel Output Snapshot */}
        {liveTelemetry && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
            <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                PYTHON ENGINE
              </span>
              <div className="font-bold text-emerald-400">
                v{liveTelemetry.pythonVersion || "3.10"} ({liveTelemetry.platform})
              </div>
            </div>

            <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                CPU LOAD (PROC/LOADAVG)
              </span>
              <div className="font-bold text-white">
                {liveTelemetry.cpu?.loadPercent}% • {liveTelemetry.cpu?.cores} Cores
              </div>
            </div>

            <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                RAM (PROC/MEMINFO)
              </span>
              <div className="font-bold text-white">
                {liveTelemetry.memory?.usedGB} GB / {liveTelemetry.memory?.totalGB} GB ({liveTelemetry.memory?.usedPercent}%)
              </div>
            </div>

            <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                ACTIVE SOCKETS (SS)
              </span>
              <div className="font-bold text-amber-400">
                {liveTelemetry.sockets?.length || 0} Listening Ports
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Codebase File Selector & Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Sidebar: Python Files List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-1">
            PYTHON SOURCE MODULES
          </div>

          <div className="space-y-1.5">
            {pythonFiles.map((f) => (
              <button
                key={f.name}
                onClick={() => setSelectedFileName(f.name)}
                className={`w-full text-left rounded p-2.5 border transition-all cursor-pointer ${
                  selectedFileName === f.name
                    ? "bg-slate-900 border-emerald-500/50 text-white shadow-xs"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="truncate">{f.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                    {f.framework}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-tight">
                  {f.description}
                </p>
              </button>
            ))}
          </div>

          {/* Quick Launch Commands */}
          <div className="rounded bg-slate-900 p-3 border border-slate-800 space-y-2 text-[11px] mt-4">
            <div className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <Terminal className="h-3 w-3" />
              KALI HOST LAUNCHERS
            </div>
            <div className="space-y-1.5 text-[10px] text-slate-300">
              <div className="rounded bg-slate-950 p-1.5 border border-slate-800">
                <span className="text-slate-500 block text-[8px] uppercase">Flask Server (Auto/Custom Port):</span>
                <code className="text-emerald-400 font-bold">PORT=9090 python3 app.py</code>
              </div>
              <div className="rounded bg-slate-950 p-1.5 border border-slate-800">
                <span className="text-slate-500 block text-[8px] uppercase">Django Server (Custom Port):</span>
                <code className="text-emerald-400 font-bold">python3 manage.py runserver 0.0.0.0:9000</code>
              </div>
              <div className="rounded bg-slate-950 p-1.5 border border-slate-800">
                <span className="text-slate-500 block text-[8px] uppercase">Telemetry CLI (Direct /proc):</span>
                <code className="text-emerald-400 font-bold">python3 telemetry.py</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Code Display Area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedFile ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
              {/* Code Header Bar */}
              <div className="flex flex-wrap items-center justify-between bg-slate-900 px-4 py-2.5 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase">{selectedFile.name}</span>
                  <span className="text-[10px] text-slate-500">({selectedFile.framework})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedFile.content, selectedFile.name)}
                    className="flex items-center gap-1 rounded bg-slate-950 px-2.5 py-1 text-[10px] uppercase font-bold text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === selectedFile.name ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedKey === selectedFile.name ? "COPIED" : "COPY CODE"}</span>
                  </button>

                  <button
                    onClick={() => downloadFile(selectedFile.content, selectedFile.name.split("/").pop() || selectedFile.name)}
                    className="flex items-center gap-1 rounded bg-slate-950 px-2.5 py-1 text-[10px] uppercase font-bold text-emerald-400 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>DOWNLOAD</span>
                  </button>
                </div>
              </div>

              {/* Code Content */}
              <div className="p-4 max-h-[500px] overflow-y-auto bg-black/40 text-xs">
                <pre className="text-slate-300 whitespace-pre leading-relaxed font-mono">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
              Loading Python source files...
            </div>
          )}

          {/* Interactive Python 3 Execution Console */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Live Python 3 Interactive Shell on Host
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                EXECUTES VIA PYTHON 3.10 KERNEL
              </span>
            </div>

            <textarea
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              rows={6}
              className="w-full rounded border border-slate-800 bg-slate-950 p-3 text-xs text-emerald-300 font-mono focus:border-emerald-500 focus:outline-hidden"
              placeholder="Type any Python 3 code to execute on the Linux host..."
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase">
                Zero simulation • Direct system call execution
              </span>
              
              <button
                onClick={handleRunPython}
                disabled={isExecuting}
                className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {isExecuting ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    <span>EXECUTING...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>RUN PYTHON SCRIPT</span>
                  </>
                )}
              </button>
            </div>

            {/* Execution Output */}
            {execResult && (
              <div className="rounded bg-slate-950 p-3 border border-slate-800 text-xs space-y-2 mt-2">
                <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 font-bold border-b border-slate-800 pb-1">
                  <span>EXIT CODE: {execResult.exitCode}</span>
                  <span>TIME: {execResult.executionTimeMs}ms</span>
                </div>
                {execResult.stdout && (
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                    {execResult.stdout}
                  </pre>
                )}
                {execResult.stderr && (
                  <pre className="text-red-400 whitespace-pre-wrap leading-relaxed">
                    {execResult.stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
