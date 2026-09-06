import React from "react";
import {
  ExternalLink,
  Shield,
  Activity,
  Globe,
  Radar,
  Eye,
  BarChart3,
  Bug,
  Server,
  Network,
} from "lucide-react";

export interface SecurityTool {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
  status: "available" | "planned";
  icon: React.ReactNode;
  accent: string;
}

interface SecurityToolCardProps {
  tool: SecurityTool;
}

export const SecurityToolCard: React.FC<SecurityToolCardProps> = ({
  tool,
}) => {
  const isAvailable = tool.status === "available";

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-slate-900/80 p-5 transition-all duration-300 ${
        isAvailable
          ? "border-slate-700 hover:border-emerald-500/60 hover:bg-slate-900"
          : "border-slate-800 opacity-75"
      }`}
    >
      {/* Top accent line */}
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          isAvailable ? "bg-emerald-500/70" : "bg-slate-700"
        }`}
      />

      {/* Background glow */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 ${
          isAvailable
            ? "bg-emerald-500/10 opacity-0 group-hover:opacity-100"
            : "bg-slate-500/5"
        }`}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg border ${
              isAvailable
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-950 text-slate-500"
            }`}
          >
            {tool.icon}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
              isAvailable
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-950 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAvailable ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />

            {isAvailable ? "AVAILABLE" : "PLANNED"}
          </span>
        </div>

        {/* Tool information */}
        <div className="mt-5">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {tool.category}
          </div>

          <h3 className="mt-1 text-base font-bold uppercase tracking-wide text-white">
            {tool.name}
          </h3>

          <p className="mt-2 min-h-[48px] text-[11px] leading-relaxed text-slate-400">
            {tool.description}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-slate-600">
            {isAvailable ? (
              <>
                <Activity className="h-3 w-3 text-emerald-500" />
                External Service
              </>
            ) : (
              <>
                <Shield className="h-3 w-3" />
                Integration Planned
              </>
            )}
          </div>

          {isAvailable ? (
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition-all hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              Open Tool
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-600"
            >
              Coming Soon
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
