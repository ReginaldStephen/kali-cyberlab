import React, { useState, useEffect } from "react";
import { 
  DownloadCloud, 
  Terminal, 
  Server, 
  Copy, 
  Check, 
  FileCode, 
  Layers, 
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

export const KaliMigrationGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [exportData, setExportData] = useState<{
    serviceFileContent: string;
    installScript: string;
    commands: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/export/kali-instructions")
      .then((res) => res.json())
      .then((data) => setExportData(data))
      .catch((err) => console.error("Failed to load export instructions:", err));
  }, []);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <DownloadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Kali Linux Server Migration & Deployment Kit
            </h2>
            <p className="text-[10px] uppercase text-slate-500 mt-0.5">
              AUTOMATION SCRIPTS AND SYSTEMD DAEMONS TO RUN THIS FULL-STACK CYBERLAB ON YOUR PHYSICAL/VIRTUAL KALI BOX
            </p>
          </div>
        </div>
      </div>

      {/* 4-Step Migration Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Step 1: Export & Transfer */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800">
              1
            </span>
            <span className="text-xs uppercase tracking-wider">Export & Transfer to Kali Host</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Export the project as a ZIP from the top AI Studio settings menu or git repository, then copy it to your Kali Linux server via SCP or SFTP:
          </p>
          <div className="rounded bg-slate-950 p-2.5 border border-slate-800 text-[11px] text-slate-200 flex items-center justify-between">
            <code className="text-emerald-400 truncate font-bold">
              scp cyberlab.zip kali@your-server-ip:/opt/
            </code>
            <button
              onClick={() => copyText("scp cyberlab.zip kali@your-server-ip:/opt/", "step1")}
              className="text-slate-500 hover:text-white ml-2 shrink-0 cursor-pointer"
            >
              {copiedKey === "step1" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 2: Install Node & Tooling */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800">
              2
            </span>
            <span className="text-xs uppercase tracking-wider">Install Kali Networking Binaries</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Ensure Node.js and the standard Kali diagnostic binaries (nmap, curl, traceroute, iproute2) are installed:
          </p>
          <div className="rounded bg-slate-950 p-2.5 border border-slate-800 text-[11px] text-slate-200 flex items-center justify-between">
            <code className="text-emerald-400 truncate font-bold">
              sudo apt-get update && sudo apt-get install -y nodejs npm nmap curl traceroute
            </code>
            <button
              onClick={() => copyText("sudo apt-get update && sudo apt-get install -y nodejs npm nmap curl traceroute", "step2")}
              className="text-slate-500 hover:text-white ml-2 shrink-0 cursor-pointer"
            >
              {copiedKey === "step2" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 3: Build & Launch */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800">
              3
            </span>
            <span className="text-xs uppercase tracking-wider">Install & Start Full-Stack Server</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Unzip the project directory, install dependencies, compile the production bundle, and run:
          </p>
          <div className="rounded bg-slate-950 p-2.5 border border-slate-800 text-[11px] text-slate-200 flex items-center justify-between">
            <code className="text-emerald-400 truncate font-bold">
              npm install && npm run build && npm start
            </code>
            <button
              onClick={() => copyText("npm install && npm run build && npm start", "step3")}
              className="text-slate-500 hover:text-white ml-2 shrink-0 cursor-pointer"
            >
              {copiedKey === "step3" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 4: Background Service */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800">
              4
            </span>
            <span className="text-xs uppercase tracking-wider">Systemd Daemon (Optional)</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            To keep your CyberLab running 24/7 in background even after rebooting your Kali server:
          </p>
          <div className="rounded bg-slate-950 p-2.5 border border-slate-800 text-[11px] text-slate-200 flex items-center justify-between">
            <code className="text-emerald-400 truncate font-bold">
              sudo systemctl enable --now cyberlab
            </code>
            <button
              onClick={() => copyText("sudo systemctl enable --now cyberlab", "step4")}
              className="text-slate-500 hover:text-white ml-2 shrink-0 cursor-pointer"
            >
              {copiedKey === "step4" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

      </div>

      {/* Downloadable Automation Scripts */}
      {exportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* setup-kali.sh */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <FileCode className="h-4 w-4 text-emerald-400" />
                setup-kali.sh (One-Click Installer)
              </span>
              <button
                onClick={() => downloadFile(exportData.installScript, "setup-kali.sh")}
                className="flex items-center gap-1 text-[10px] uppercase font-bold rounded bg-slate-950 px-2.5 py-1 text-emerald-400 border border-slate-800 hover:bg-slate-800 cursor-pointer"
              >
                <DownloadCloud className="h-3 w-3" /> Download Script
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto rounded bg-slate-950 p-3 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800">
              {exportData.installScript}
            </pre>
          </div>

          {/* cyberlab.service */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Server className="h-4 w-4 text-emerald-400" />
                cyberlab.service (Systemd Template)
              </span>
              <button
                onClick={() => downloadFile(exportData.serviceFileContent, "cyberlab.service")}
                className="flex items-center gap-1 text-[10px] uppercase font-bold rounded bg-slate-950 px-2.5 py-1 text-emerald-400 border border-slate-800 hover:bg-slate-800 cursor-pointer"
              >
                <DownloadCloud className="h-3 w-3" /> Download Service
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto rounded bg-slate-950 p-3 text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800">
              {exportData.serviceFileContent}
            </pre>
          </div>

        </div>
      )}
    </div>
  );
};
