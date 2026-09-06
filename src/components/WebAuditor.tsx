import React, { useState } from "react";
import { WebAuditResult } from "../types";
import { 
  Globe, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Play, 
  Server, 
  Clock, 
  Code
} from "lucide-react";

interface WebAuditorProps {
  onRunAudit: (url: string) => Promise<void>;
  isLoading: boolean;
  auditResult: WebAuditResult | null;
  targetUrl: string;
  setTargetUrl: (url: string) => void;
}

export const WebAuditor: React.FC<WebAuditorProps> = ({
  onRunAudit,
  isLoading,
  auditResult,
  targetUrl,
  setTargetUrl,
}) => {
  const [showRawHeaders, setShowRawHeaders] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    onRunAudit(targetUrl.trim());
  };

  const getGradeBadge = (grade?: WebAuditResult['securityGrade']) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "B":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "C":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "D":
      case "F":
      default:
        return "bg-red-600/10 text-red-400 border-red-600/30";
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Target URL Input */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              Website & HTTP/HTTPS Security Posture Auditor
            </h2>
            <p className="text-[10px] uppercase text-slate-500 mt-0.5">
              EVALUATES SSL/TLS CERTIFICATE CHAINS, ESSENTIAL SECURITY HEADERS (HSTS, CSP, X-FRAME) VIA REAL CURL
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-[10px] uppercase font-bold">
                URL:
              </div>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="example.com or 192.168.1.1:8080 or localhost:3000"
                className="w-full rounded border border-slate-700 bg-slate-950 py-2.5 pl-16 pr-4 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
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
                  <span>AUDITING POSTURE...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-white" />
                  <span>AUDIT HEADERS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {!auditResult ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            No Website Audit Executed Yet
          </h3>
          <p className="mt-1 text-[11px] text-slate-600 max-w-md mx-auto">
            Input a website URL or server web port above to inspect live SSL configuration, HSTS, Content Security Policy, and header defenses.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Audit Overview Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded border text-xl font-bold ${getGradeBadge(auditResult.securityGrade)}`}>
                  {auditResult.securityGrade}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-wide">
                      {auditResult.url}
                    </span>
                    <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-400 border border-slate-800">
                      HTTP {auditResult.statusCode} {auditResult.statusText}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase text-slate-400 mt-0.5">
                    PROTOCOL: <span className="text-slate-200">{auditResult.protocol}</span> • SCORE: <span className="text-emerald-400 font-bold">{auditResult.securityScore}/100</span> • LATENCY: <span className="text-slate-200">{auditResult.responseTimeMs}ms</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRawHeaders(!showRawHeaders)}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Code className="h-3.5 w-3.5 text-slate-400" />
                <span>{showRawHeaders ? "HIDE RAW HEADERS" : "VIEW RAW HEADERS"}</span>
              </button>
            </div>

            {/* SSL Details if available */}
            {auditResult.ssl && (
              <div className="mt-3 rounded bg-slate-950 p-3 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Lock className={`h-4 w-4 ${auditResult.ssl.valid ? "text-emerald-400" : "text-amber-400"}`} />
                  <span>SSL/TLS: <strong className="text-white">{auditResult.ssl.protocol}</strong></span>
                  <span className="text-slate-500">• ISSUER: {auditResult.ssl.issuer}</span>
                </div>
                <div className="text-[10px] uppercase text-slate-400">
                  VALID UNTIL: <span className="text-slate-200">{new Date(auditResult.ssl.validTo || "").toLocaleDateString()}</span> ({auditResult.ssl.daysRemaining} DAYS REMAINING)
                </div>
              </div>
            )}

            {/* Raw Headers Drawer */}
            {showRawHeaders && (
              <div className="mt-3 rounded border border-slate-800 bg-black/50 p-3 text-[11px]">
                <div className="text-slate-500 uppercase text-[10px] font-bold mb-1 border-b border-slate-800 pb-1">RAW RESPONSE HEADERS:</div>
                <pre className="max-h-48 overflow-y-auto text-emerald-400/90 whitespace-pre-wrap">
                  {auditResult.rawOutput || JSON.stringify(auditResult.headers, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Security Headers Checklist Grid */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              ESSENTIAL SECURITY HEADERS EVALUATION:
            </h3>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {auditResult.securityHeaders.map((hdr) => (
                <div
                  key={hdr.name}
                  className={`rounded p-3 border transition-all ${
                    hdr.present
                      ? "bg-slate-950 border-emerald-900/30 text-slate-200"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">
                      {hdr.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] uppercase font-bold border ${
                      hdr.present
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-600/10 text-red-400 border-red-600/20"
                    }`}>
                      {hdr.present ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> PASS
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> MISSING ({hdr.severity.toUpperCase()})
                        </>
                      )}
                    </span>
                  </div>

                  {hdr.present && hdr.value && (
                    <p className="mt-1 text-[10px] text-slate-500 truncate" title={hdr.value}>
                      VALUE: <span className="text-slate-300">{hdr.value}</span>
                    </p>
                  )}

                  {!hdr.present && (
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                      {hdr.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
