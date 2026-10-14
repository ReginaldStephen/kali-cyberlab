import React from "react";
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  Server,
  Activity,
  AlertTriangle,
  Radio,
  LockKeyhole,
} from "lucide-react";

interface WazuhDashboardProps {
  onBack: () => void;
}

const WAZUH_DASHBOARD_URL = "https://127.0.0.1:443";

export const WazuhDashboard: React.FC<WazuhDashboardProps> = ({
  onBack,
}) => {
  const openWazuh = () => {
    window.open(
      WAZUH_DASHBOARD_URL,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] px-6 py-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Arsenal
            </button>

            <div className="h-8 w-px bg-slate-800" />

            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />

                <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white">
                  Wazuh
                </h1>

                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Not Connected
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Endpoint security, XDR, threat detection and security monitoring.
              </p>
            </div>
          </div>

          <button
            onClick={openWazuh}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500"
          >
            <ExternalLink className="h-4 w-4" />
            Open Wazuh Dashboard
          </button>
        </div>

        {/* Connection banner */}
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5">
              <LockKeyhole className="h-5 w-5 text-amber-400" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                Wazuh integration not connected
              </div>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                CyberLab is ready for the Wazuh integration, but no Wazuh
                Manager or Dashboard is currently detected on this host.
              </p>

              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-[10px] text-slate-500">
                Dashboard endpoint:{" "}
                <span className="text-slate-300">
                  {WAZUH_DASHBOARD_URL}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Integration cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Manager
              </div>

              <Server className="h-4 w-4 text-slate-600" />
            </div>

            <div className="mt-4 text-sm font-bold text-slate-400">
              Not detected
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              Wazuh Manager
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Agents
              </div>

              <Radio className="h-4 w-4 text-slate-600" />
            </div>

            <div className="mt-4 text-sm font-bold text-slate-400">
              —
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              Awaiting Wazuh connection
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Alerts
              </div>

              <AlertTriangle className="h-4 w-4 text-slate-600" />
            </div>

            <div className="mt-4 text-sm font-bold text-slate-400">
              —
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              Awaiting Wazuh connection
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Events
              </div>

              <Activity className="h-4 w-4 text-slate-600" />
            </div>

            <div className="mt-4 text-sm font-bold text-slate-400">
              —
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              Awaiting Wazuh connection
            </div>
          </div>
        </div>

        {/* Future interoperability */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-cyan-400" />

            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                CyberLab Interoperability
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                Planned integration points
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Alert Center",
              "AI Security Buddy",
              "Telegram",
              "Security Reports",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {item}
                </div>

                <div className="mt-1 text-[9px] text-slate-600">
                  Integration pending
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
