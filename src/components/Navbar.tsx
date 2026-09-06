import React from "react";
import {
  ShieldAlert,
  Activity,
  Terminal,
  Globe,
  FileText,
  DownloadCloud,
  Radio,
  History,
  Server,
  Code,
  Boxes
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isContinuousActive: boolean;
  onToggleContinuous: () => void;
  continuousSeconds: number;
  openHistory: () => void;
  historyCount: number;
  serverHostname?: string;
  osDistro?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isContinuousActive,
  onToggleContinuous,
  continuousSeconds,
  openHistory,
  historyCount,
  serverHostname = "kali-srv-01",
  osDistro = "Kali Linux SOC",
}) => {
const tabs = [
  { id: "network", label: "Network Scanner", icon: Activity },
  { id: "web", label: "Web Posture Audit", icon: Globe },
  { id: "terminal", label: "Kali Terminal", icon: Terminal },
  { id: "remediation", label: "Vulnerabilities & Fixes", icon: ShieldAlert },
  { id: "reports", label: "Executive Reports", icon: FileText },
  { id: "arsenal", label: "Security Arsenal", icon: Boxes },
  { id: "python", label: "Python Engine", icon: Code },
  { id: "migration", label: "Kali Deploy Kit", icon: DownloadCloud },
];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand & SOC Host Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 shadow-sm relative">
            <Server className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-widest text-white uppercase">
                KALI-LAB-X
              </h1>
              <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                SOC ACTIVE
              </span>
            </div>
            <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              HOST: <span className="text-slate-400 font-semibold">{serverHostname}</span> • {osDistro}
            </p>
          </div>
        </div>

        {/* Center / Nav Tabs */}
        <nav className="hidden lg:flex items-center gap-1.5 rounded-lg bg-slate-950/80 p-1 border border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-mono font-medium transition-all ${
                  isActive
                    ? "bg-slate-800 text-white shadow-xs border border-slate-700/80"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools: 5s Continuous Scan Toggle & History */}
        <div className="flex items-center gap-2">
          {/* Continuous 5s scanner toggle */}
          <button
            onClick={onToggleContinuous}
            title={isContinuousActive ? "Stop 5-second interval scanning" : "Start 5-second continuous interval scanning"}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              isContinuousActive
                ? "bg-red-600/15 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${isContinuousActive ? "text-red-400 animate-spin" : "text-white"}`} />
            <span>{isContinuousActive ? `HALT LOOP (${continuousSeconds}s)` : "AUTO 5s SCAN"}</span>
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={openHistory}
            className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span className="uppercase text-[11px]">Logs ({historyCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Tabs */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-800 bg-slate-950 px-2 py-1.5 gap-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono ${
                isActive
                  ? "bg-slate-800 text-emerald-400 border border-slate-700"
                  : "text-slate-400 hover:bg-slate-900"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
