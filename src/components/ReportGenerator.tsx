import React, { useMemo, useState } from "react";
import { RemediationReport } from "../types";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
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
  Layers,
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
  const [scopeInput, setScopeInput] = useState(
    "Kali CyberLab Infrastructure & Target Network"
  );
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const findings = report?.findings ?? [];
  const remediationRoadmap = report?.remediationRoadmap ?? [];

  const generatedDate = report
    ? new Date(report.generatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const generatedTime = report
    ? new Date(report.generatedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const severityData = useMemo(() => {
    if (!report) return [];

    const counts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Info: 0,
    };

    findings.forEach((finding) => {
      const severity =
        finding.severity.charAt(0).toUpperCase() +
        finding.severity.slice(1).toLowerCase();

      if (severity in counts) {
        counts[severity as keyof typeof counts]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [report, findings]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerateReport(
      scopeInput.trim() || "Kali CyberLab Assessment"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadMarkdown = () => {
    if (!report) return;

    let md = `# KALI CYBERLAB SECURITY ASSESSMENT REPORT\n\n`;

    md += `**Report Title:** ${report.title}\n`;
    md += `**Generated Date:** ${generatedDate}\n`;
    md += `**Generated Time:** ${generatedTime}\n`;
    md += `**Overall Risk Level:** ${report.overallRiskLevel}\n`;
    md += `**Risk Score:** ${report.riskScore}/100\n`;
    md += `**Hosts Scanned:** ${report.totalHostsScanned}\n`;
    md += `**Open Ports:** ${report.totalOpenPorts}\n\n`;

    md += `## 1. Executive Summary\n\n`;
    md += `${report.summaryText}\n\n`;

    md += `## 2. Security Risk Overview\n\n`;
    md += `Overall Risk: ${report.overallRiskLevel}\n`;
    md += `Risk Score: ${report.riskScore}/100\n\n`;

    md += `## 3. Discovered Security Findings (${findings.length})\n\n`;

    findings.forEach((f, idx) => {
      md += `### ${idx + 1}. ${f.title}\n`;
      md += `- **Severity:** ${f.severity.toUpperCase()}\n`;
      md += `- **Target:** ${f.target}\n`;
      md += `- **Port:** ${f.port ?? "N/A"}\n`;
      md += `- **CVSS Score:** ${f.cvssScore}\n`;
      md += `- **Category:** ${f.category}\n`;
      md += `- **Description:** ${f.description}\n`;
      md += `- **Security Impact:** ${f.impact}\n`;
      md += `- **Remediation:** ${f.remediationAdvice}\n`;

      if (f.kaliCommands?.length) {
        md += `\n**Kali Remediation Commands:**\n`;
        md += "```bash\n";
        md += `${f.kaliCommands.join("\n")}\n`;
        md += "```\n";
      }

      md += `\n`;
    });

    md += `## 4. Prioritized Remediation Roadmap\n\n`;

    remediationRoadmap.forEach((step) => {
      md += `### Phase ${step.step}: ${step.phase}\n`;
      md += `**Priority:** ${step.priority}\n`;
      md += `**Action:** ${step.action}\n`;

      if (step.commands?.length) {
        md += "\n```bash\n";
        md += `${step.commands.join("\n")}\n`;
        md += "```\n";
      }

      md += "\n";
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

  const severityClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "severity-critical";
      case "high":
        return "severity-high";
      case "medium":
        return "severity-medium";
      case "low":
        return "severity-low";
      default:
        return "severity-info";
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* =========================
          REPORT GENERATOR CONTROLS
      ========================== */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm no-print">
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Executive Security Report & Audit Compiler
              </h2>

              <p className="text-[10px] uppercase text-slate-500 mt-0.5">
                COMPILES LIVE ASSETS, VULNERABILITIES, CVSS METRICS, AND
                MITIGATION COMMANDS INTO AUDIT ARTIFACTS
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>COMPILING...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>GENERATE REPORT</span>
                </>
              )}
            </button>
          </div>

          <input
            type="text"
            value={scopeInput}
            onChange={(e) => setScopeInput(e.target.value)}
            placeholder="Report Scope Title"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
          />
        </form>
      </div>

      {!report ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center no-print">
          <FileText className="mx-auto h-8 w-8 text-slate-600 mb-2" />

          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            No Report Compiled Yet
          </h3>

          <p className="mt-1 text-[11px] text-slate-600 max-w-md mx-auto">
            Click 'Generate Report' to assemble the live terminal findings,
            open services, and risk analysis into a comprehensive security
            document.
          </p>
        </div>
      ) : (
        <>
          {/* =========================
              ACTION BAR
          ========================== */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 no-print">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />

              <span className="text-[11px] uppercase font-bold">
                GENERATED: {generatedDate} • {generatedTime}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                PRINT / PDF
              </button>

              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                DOWNLOAD MD
              </button>

              <button
                onClick={copyJson}
                className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                {copiedFormat === "json" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}

                COPY JSON
              </button>
            </div>
          </div>

          {/* =====================================================
              PROFESSIONAL PRINT / PDF REPORT
          ====================================================== */}
          <div className="professional-report">

            {/* COVER / REPORT HEADER */}
            <section className="report-cover">
              <div className="report-brand">
                <div className="report-brand-mark">
                  <ShieldCheck />
                </div>

                <div>
                  <div className="report-brand-name">
                    KALI CYBERLAB
                  </div>

                  <div className="report-brand-subtitle">
                    DEFENSIVE SECURITY ASSESSMENT
                  </div>
                </div>
              </div>

              <div className="report-cover-line" />

              <div className="report-cover-content">
                <div className="report-label">
                  SECURITY ASSESSMENT REPORT
                </div>

                <h1>{report.title}</h1>

                <p className="report-scope">
                  {scopeInput}
                </p>
              </div>

              <div className="report-cover-meta">
                <div>
                  <span>REPORT DATE</span>
                  <strong>{generatedDate}</strong>
                </div>

                <div>
                  <span>REPORT TIME</span>
                  <strong>{generatedTime}</strong>
                </div>

                <div>
                  <span>HOSTS SCANNED</span>
                  <strong>{report.totalHostsScanned}</strong>
                </div>

                <div>
                  <span>OPEN PORTS</span>
                  <strong>{report.totalOpenPorts}</strong>
                </div>
              </div>

              <div className="report-confidential">
                CONFIDENTIAL • AUTHORIZED SECURITY ASSESSMENT
              </div>
            </section>

            {/* EXECUTIVE OVERVIEW */}
            <section className="report-section">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <h2>Executive Overview</h2>
                  <p>Management-level security posture summary</p>
                </div>
              </div>

              <div className="overview-grid">
                <div className="overview-card risk-card">
                  <span>OVERALL RISK</span>
                  <strong>{report.overallRiskLevel}</strong>
                  <small>Current security posture</small>
                </div>

                <div className="overview-card">
                  <span>RISK SCORE</span>
                  <strong>{report.riskScore}/100</strong>
                  <small>Security exposure index</small>
                </div>

                <div className="overview-card">
                  <span>FINDINGS</span>
                  <strong>{findings.length}</strong>
                  <small>Identified security issues</small>
                </div>

                <div className="overview-card">
                  <span>OPEN SERVICES</span>
                  <strong>{report.totalOpenPorts}</strong>
                  <small>Ports identified during assessment</small>
                </div>
              </div>

             <div className="executive-summary-box">
  <div className="summary-title">
    EXECUTIVE SUMMARY
  </div>

  <div className="assessment-summary">
    <p>
      The assessment of <strong>{scopeInput}</strong> identified{" "}
      <strong>{findings.length}</strong> security finding
      {findings.length === 1 ? "" : "s"} across the assessed
      environment. The current overall security posture is rated{" "}
      <strong>{report.overallRiskLevel}</strong>, with a risk
      score of <strong>{report.riskScore}/100</strong>.
    </p>

    <p>
      The assessment covered{" "}
      <strong>{report.totalHostsScanned}</strong> host
      {report.totalHostsScanned === 1 ? "" : "s"} and{" "}
      <strong>{report.totalOpenPorts}</strong> exposed or
      identified service port
      {report.totalOpenPorts === 1 ? "" : "s"}.
      Findings documented in this report include their technical
      description, security impact, severity, CVSS score,
      recommended remediation, and applicable Kali Linux commands.
    </p>

    <p>
      Remediation should be prioritized according to the severity
      and business/security impact of each finding. Critical and
      high-severity issues should receive immediate attention,
      followed by medium-risk weaknesses and standard security
      hardening activities.
    </p>
  </div>
</div>
             
            </section>

            {/* RISK ANALYTICS */}
            <section className="report-section page-break-before">
              <div className="section-heading">
                <span>02</span>
                <div>
                  <h2>Security Risk Analysis</h2>
                  <p>Assessment metrics and vulnerability distribution</p>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>Risk Score</h3>

                  <div className="risk-score-display">
                    <div className="risk-ring">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Risk",
                                value: report.riskScore,
                              },
                              {
                                name: "Remaining",
                                value: Math.max(
                                  0,
                                  100 - report.riskScore
                                ),
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={72}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="risk-ring-label">
                        {report.riskScore}
                      </div>
                    </div>

                    <div>
                      <span className="analytics-label">
                        CURRENT POSTURE
                      </span>

                      <strong className="posture-value">
                        {report.overallRiskLevel}
                      </strong>

                      <p>
                        Risk score calculated across the assessed
                        infrastructure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Vulnerability Severity Distribution</h3>

                  <div className="severity-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#d1d5db"
                        />

                        <XAxis
                          dataKey="name"
                          tick={{
                            fill: "#374151",
                            fontSize: 10,
                          }}
                        />

                        <YAxis
                          allowDecimals={false}
                          tick={{
                            fill: "#374151",
                            fontSize: 10,
                          }}
                        />

                        <Bar
                          dataKey="value"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* FINDINGS */}
            <section className="report-section page-break-before">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <h2>Security Findings</h2>
                  <p>Detailed vulnerabilities identified during assessment</p>
                </div>
              </div>

              {findings.length === 0 ? (
                <div className="no-findings">
                  <ShieldCheck />
                  <strong>No vulnerabilities identified</strong>
                  <p>
                    All tested services and ports passed the configured
                    assessment baseline.
                  </p>
                </div>
              ) : (
                <div className="findings-list">
                  {findings.map((f, idx) => (
                    <article
                      key={f.id || idx}
                      className="finding-card"
                    >
                      <div className="finding-header">
                        <div className="finding-number">
                          {String(idx + 1).padStart(2, "0")}
                        </div>

                        <div className="finding-title">
                          <h3>{f.title}</h3>

                          <div className="finding-meta">
                            <span>
                              TARGET: {f.target}
                            </span>

                            <span>
                              PORT: {f.port ?? "N/A"}
                            </span>

                            <span>
                              CATEGORY: {f.category}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`finding-severity ${severityClass(
                            f.severity
                          )}`}
                        >
                          <strong>
                            {f.severity.toUpperCase()}
                          </strong>

                          <span>
                            CVSS {f.cvssScore}
                          </span>
                        </div>
                      </div>

                      <div className="finding-body">
                        <div>
                          <h4>DESCRIPTION</h4>
                          <p>{f.description}</p>
                        </div>

                        <div>
                          <h4>SECURITY IMPACT</h4>
                          <p>{f.impact}</p>
                        </div>

                        <div className="remediation-box">
                          <h4>
                            RECOMMENDED REMEDIATION
                          </h4>

                          <p>{f.remediationAdvice}</p>

                          {f.kaliCommands?.length > 0 && (
                            <div className="command-box">
                              <div className="command-title">
                                <Terminal />
                                KALI LINUX COMMANDS
                              </div>

                              {f.kaliCommands.map((cmd, i) => (
                                <div
                                  key={i}
                                  className="command-line"
                                >
                                  <span>$</span>
                                  {cmd}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* REMEDIATION ROADMAP */}
            <section className="report-section page-break-before">
              <div className="section-heading">
                <span>04</span>
                <div>
                  <h2>Prioritized Remediation Roadmap</h2>
                  <p>Recommended sequence for reducing security exposure</p>
                </div>
              </div>

              {remediationRoadmap.length === 0 ? (
                <div className="no-findings">
                  <Layers />
                  <strong>No remediation roadmap generated</strong>
                </div>
              ) : (
                <div className="roadmap">
                  {remediationRoadmap.map((item) => (
                    <article
                      key={item.step}
                      className="roadmap-item"
                    >
                      <div className="roadmap-step">
                        {String(item.step).padStart(2, "0")}
                      </div>

                      <div className="roadmap-content">
                        <div className="roadmap-header">
                          <div>
                            <span>PHASE</span>
                            <h3>{item.phase}</h3>
                          </div>

                          <strong>{item.priority}</strong>
                        </div>

                        <p>{item.action}</p>

                        {item.commands?.length > 0 && (
                          <div className="command-box">
                            <div className="command-title">
                              <Terminal />
                              REMEDIATION COMMANDS
                            </div>

                            {item.commands.map((cmd, cIdx) => (
                              <div
                                key={cIdx}
                                className="command-line"
                              >
                                <span>#</span>
                                {cmd}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            
            {/* EXECUTIVE RECOMMENDATIONS */}
<section className="report-section executive-recommendations page-break-before">
  <div className="section-heading">
    <span>05</span>
    <div>
      <h2>Executive Recommendations</h2>
      <p>Consolidated actions derived from the security assessment</p>
    </div>
  </div>

  <div className="recommendation-summary">
    <div className="recommendation-stat">
      <strong>{findings.length}</strong>
      <span>TOTAL FINDINGS</span>
    </div>

    <div className="recommendation-stat critical">
      <strong>
        {findings.filter((f) => f.severity === "critical").length}
      </strong>
      <span>CRITICAL</span>
    </div>

    <div className="recommendation-stat high">
      <strong>
        {findings.filter((f) => f.severity === "high").length}
      </strong>
      <span>HIGH</span>
    </div>

    <div className="recommendation-stat medium">
      <strong>
        {findings.filter((f) => f.severity === "medium").length}
      </strong>
      <span>MEDIUM</span>
    </div>
  </div>

  <div className="executive-summary-box">
    <h3>OVERALL ASSESSMENT SUMMARY</h3>

    <p>
      {report.summaryText}
    </p>
  </div>

  <div className="recommendation-grid">

    <div className="recommendation-card">
      <h3>01 — IMMEDIATE PRIORITIES</h3>

      <p>
        Address all Critical and High severity findings first.
        These findings represent the greatest potential security
        exposure and should receive immediate technical attention.
      </p>
    </div>

    <div className="recommendation-card">
      <h3>02 — SYSTEM HARDENING</h3>

      <p>
        Review exposed services, unnecessary open ports,
        authentication controls, network segmentation and
        system configuration identified during the assessment.
      </p>
    </div>

    <div className="recommendation-card">
      <h3>03 — VALIDATION</h3>

      <p>
        After remediation, perform a follow-up security scan
        to confirm that vulnerabilities have been resolved and
        that previously exposed services are no longer presenting
        unacceptable risk.
      </p>
    </div>

    <div className="recommendation-card">
      <h3>04 — CONTINUOUS MONITORING</h3>

      <p>
        Incorporate recurring vulnerability assessments,
        configuration reviews and security monitoring into the
        regular CyberLab infrastructure maintenance process.
      </p>
    </div>

  </div>
</section>
            <section className="report-section final-section">
              <div className="section-heading">
                <span>06</span>
                <div>
                  <h2>Assessment Conclusion</h2>
                  <p>Final security posture statement</p>
                </div>
              </div>

              <div className="conclusion-box">
                <AlertTriangle />

                <div>
                  <h3>SECURITY POSTURE: {report.overallRiskLevel.toUpperCase()}</h3>

                  <p>
                    The assessment identified{" "}
                    <strong>{findings.length}</strong> security
                    finding(s) across{" "}
                    <strong>{report.totalHostsScanned}</strong>{" "}
                    assessed host(s). The current risk score is{" "}
                    <strong>{report.riskScore}/100</strong>.
                  </p>

                  <p>
                    Remediation activities should be prioritized
                    according to finding severity and the remediation
                    roadmap provided in this report.
                  </p>
                </div>
              </div>
            </section>

            {/* REPORT FOOTER */}
            <footer className="report-footer">
              <div>
                <strong>KALI CYBERLAB</strong>
                <span>Defensive Security Assessment Platform</span>
              </div>

              <div className="footer-meta">
                <span>
                  Generated: {generatedDate} {generatedTime}
                </span>

                <span>
                  CONFIDENTIAL
                </span>
              </div>
            </footer>
          </div>
        </>
      )}
    </div>
  );
};
