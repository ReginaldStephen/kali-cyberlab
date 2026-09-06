import React, { useState } from "react";
import { RemediationReport, VulnerabilityFinding } from "../types";
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  RotateCw, 
  ShieldCheck, 
  AlertTriangle,
  Terminal,
  Calendar,
  Layers
} from "lucide-react";

interface ReportGeneratorProps {
  report: RemediationReport | null;
  onGenerateReport: (scope: string) => Promise<void>;
  isLoading: boolean;
  activeFindingsCount: number;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  report,
  onGenerateReport,
  isLoading,
  activeFindingsCount,
}) => {
  const [scopeInput, setScopeInput] = useState("Kali CyberLab Infrastructure & Target Network");
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateReport(scopeInput.trim() || "Kali CyberLab Assessment");
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadMarkdown = () => {
    if (!report) return;
    let md = `# CyberLab Defensive Assessment Report\n\n`;
    md += `**Title:** ${report.title}\n`;
    md += `**Generated At:** ${new Date(report.generatedAt).toLocaleString()}\n`;
    md += `**Overall Risk Level:** ${report.overallRiskLevel} (Risk Score: ${report.riskScore}/100)\n\n`;
    md += `## Executive Summary\n${report.summaryText}\n\n`;
    md += `## Discovered Security Findings (${report.findings.length})\n\n`;

    report.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n`;
      md += `- **Target:** ${f.target} ${f.port ? `(Port ${f.port})` : ''}\n`;
      md += `- **CVSS Score:** ${f.cvssScore}\n`;
      md += `- **Category:** ${f.category}\n`;
      md += `- **Description:** ${f.description}\n`;
      md += `- **Security Impact:** ${f.impact}\n`;
      md += `- **Remediation Advice:** ${f.remediationAdvice}\n`;
      if (f.kaliCommands && f.kaliCommands.length > 0) {
        md += `- **Kali Remediation Commands:**\n\`\`\`bash\n${f.kaliCommands.join('\n')}\n\`\`\`\n`;
      }
      md += `\n`;
    });

    md += `## Remediation Roadmap\n\n`;
    report.remediationRoadmap.forEach((step) => {
      md += `### Step ${step.step}: ${step.action} (${step.priority})\n`;
      md += `**Phase:** ${step.phase}\n`;
      if (step.commands && step.commands.length > 0) {
        md += `\`\`\`bash\n${step.commands.join('\n')}\n\`\`\`\n`;
      }
      md += `\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CyberLab_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedFormat("json");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Report Generator Controls */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Executive Security Report & Audit Compiler
              </h2>
              <p className="text-[10px] uppercase text-slate-500 mt-0.5">
                COMPILES LIVE ASSETS, VULNERABILITIES, CVSS METRICS, AND MITIGATION COMMANDS INTO AUDIT ARTIFACTS
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin text-white" />
                    <span>COMPILING...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 text-white" />
                    <span>GENERATE REPORT</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder="Report Scope Title (e.g. Lab Target Assessment 192.168.1.0/24)"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </form>
      </div>

      {!report ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            No Report Compiled Yet
          </h3>
          <p className="mt-1 text-[11px] text-slate-600 max-w-md mx-auto">
            Click &apos;Generate Report&apos; to assemble the live terminal findings, open services, and risk analysis into a comprehensive security document.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Bar: Print, Markdown, JSON */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] uppercase font-bold">GENERATED: {new Date(report.generatedAt).toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>PRINT / PDF</span>
              </button>

              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>DOWNLOAD MD</span>
              </button>

              <button
                onClick={copyJson}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                {copiedFormat === "json" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>COPY JSON</span>
              </button>
            </div>
          </div>

          {/* Printable Report Document Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-6 text-xs text-slate-300">
            
            {/* Header Title & Risk Score */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  KALI CYBERLAB DEFENSIVE AUDIT
                </span>
                <h1 className="text-base font-bold text-white uppercase tracking-wider">
                  {report.title}
                </h1>
                <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">
                  SCOPE ASSETS: {report.totalHostsScanned} HOST(S) • {report.totalOpenPorts} PORT(S) INSPECTED
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] uppercase text-slate-500 font-bold">OVERALL RISK LEVEL</div>
                  <div className={`text-sm font-bold uppercase tracking-wider ${
                    report.overallRiskLevel === 'Critical' ? 'text-red-400' :
                    report.overallRiskLevel === 'High' ? 'text-orange-400' :
                    report.overallRiskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {report.overallRiskLevel}
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-950 border border-slate-800 font-bold text-sm text-white">
                  {report.riskScore}/100
                </div>
              </div>
            </div>

            {/* Executive Summary Section */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-2">
                1. Executive Summary & Posture Analysis
              </h3>
              <div className="rounded bg-slate-950 p-4 border border-slate-800 leading-relaxed text-slate-300 text-[11px]">
                {report.summaryText}
              </div>
            </div>

            {/* Discovered Vulnerabilities Registry */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-2">
                2. Discovered Vulnerabilities Registry ({report.findings.length})
              </h3>
              
              {report.findings.length === 0 ? (
                <div className="rounded bg-slate-950 p-4 text-center text-slate-500 border border-slate-800 text-[11px]">
                  No vulnerabilities logged for this scope. All tested ports and services passed baseline standards.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.findings.map((f, idx) => (
                    <div key={idx} className="rounded bg-slate-950 p-4 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">
                          {idx + 1}. {f.title}
                        </span>
                        <span className="rounded bg-red-600/10 px-2 py-0.5 text-[9px] text-red-400 border border-red-600/20 uppercase font-bold">
                          {f.severity} (CVSS {f.cvssScore})
                        </span>
                      </div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold">
                        TARGET: {f.target} {f.port ? `(PORT ${f.port})` : ''} • CATEGORY: {f.category}
                      </p>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {f.description}
                      </p>
                      <div className="mt-2 rounded bg-slate-900 p-2.5 border border-slate-800 text-[11px]">
                        <span className="text-emerald-400 font-bold text-[10px] uppercase block mb-1">Recommended Kali Remediation:</span>
                        <p className="text-slate-300 mb-1.5">{f.remediationAdvice}</p>
                        {f.kaliCommands && f.kaliCommands.length > 0 && (
                          <div className="bg-slate-950 rounded p-2 text-[10px] text-emerald-400 font-mono font-bold">
                            {f.kaliCommands.map((c, i) => (
                              <div key={i}>$ {c}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step-by-Step Remediation Roadmap */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-2">
                3. Prioritized Hardening Roadmap
              </h3>
              <div className="space-y-2.5">
                {report.remediationRoadmap.map((item) => (
                  <div key={item.step} className="rounded bg-slate-950 p-3 border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Phase {item.step}: {item.phase}
                      </span>
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-[9px] uppercase font-bold text-amber-400 border border-slate-800">
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {item.action}
                    </p>
                    {item.commands && item.commands.length > 0 && (
                      <div className="rounded bg-slate-900 p-2 text-[10px] font-mono text-emerald-400 border border-slate-800 font-bold">
                        {item.commands.map((cmd, cIdx) => (
                          <div key={cIdx}># {cmd}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
