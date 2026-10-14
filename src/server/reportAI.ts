import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";

export type CyberLabReportSource =
  | "network"
  | "greenbone"
  | "web"
  | "tshark"
  | "ai-remediation"
  | "system"
  | "other";

export type CyberLabReportFormat =
  | "json"
  | "markdown"
  | "html"
  | "csv"
  | "excel"
  | "pdf";

export interface CyberLabReportRecord {
  id: string;

  title: string;
  source: CyberLabReportSource;

  target?: string;
  scanId?: string;
  scannerReportId?: string;

  generatedAt: string;

  overallRiskLevel:
    | "Critical"
    | "High"
    | "Medium"
    | "Low"
    | "Secure"
    | "Unknown";

  riskScore?: number;

  findingCount: number;
  hostCount?: number;
  openPortCount?: number;

  summary?: string;

  availableFormats: CyberLabReportFormat[];

  reportData: unknown;

  createdAt: string;
  updatedAt: string;
}

interface ReportRegistryFile {
  version: 1;
  reports: CyberLabReportRecord[];
}

const DATA_DIR = path.resolve(
  process.env.CYBERLAB_REPORT_DATA_DIR ||
    path.join(process.cwd(), "data")
);

const REGISTRY_FILE = path.join(
  DATA_DIR,
  "cyberlab-report-registry.json"
);

function ensureRegistry(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(REGISTRY_FILE)) {
    const initial: ReportRegistryFile = {
      version: 1,
      reports: [],
    };

    fs.writeFileSync(
      REGISTRY_FILE,
      JSON.stringify(initial, null, 2),
      "utf8"
    );
  }
}

function readRegistry(): ReportRegistryFile {
  ensureRegistry();

  try {
    const raw = fs.readFileSync(
      REGISTRY_FILE,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    if (
      parsed &&
      parsed.version === 1 &&
      Array.isArray(parsed.reports)
    ) {
      return parsed;
    }
  } catch {
    // Recreate a clean registry below.
  }

  const fallback: ReportRegistryFile = {
    version: 1,
    reports: [],
  };

  fs.writeFileSync(
    REGISTRY_FILE,
    JSON.stringify(fallback, null, 2),
    "utf8"
  );

  return fallback;
}

function writeRegistry(
  registry: ReportRegistryFile
): void {
  ensureRegistry();

  const temporaryFile = `${REGISTRY_FILE}.tmp`;

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(registry, null, 2),
    "utf8"
  );

  fs.renameSync(
    temporaryFile,
    REGISTRY_FILE
  );
}

export function registerCyberLabReport(
  input: Omit<
    CyberLabReportRecord,
    "id" | "createdAt" | "updatedAt"
  > & {
    id?: string;
  }
): CyberLabReportRecord {
  const registry = readRegistry();
  const now = new Date().toISOString();

  const record: CyberLabReportRecord = {
    ...input,

    id:
      input.id ||
      `rpt_${crypto.randomUUID()}`,

    createdAt: now,
    updatedAt: now,
  };

  const existingIndex =
    registry.reports.findIndex(
      (report) => report.id === record.id
    );

  if (existingIndex >= 0) {
    registry.reports[existingIndex] = {
      ...registry.reports[existingIndex],
      ...record,
      createdAt:
        registry.reports[existingIndex].createdAt,
      updatedAt: now,
    };
  } else {
    registry.reports.unshift(record);
  }

  writeRegistry(registry);

  return record;
}

export function listCyberLabReports(): CyberLabReportRecord[] {
  return readRegistry().reports;
}

export function getCyberLabReport(
  id: string
): CyberLabReportRecord | null {
  return (
    readRegistry().reports.find(
      (report) => report.id === id
    ) || null
  );
}

export function deleteCyberLabReport(
  id: string
): boolean {
  const registry = readRegistry();

  const originalLength =
    registry.reports.length;

  registry.reports =
    registry.reports.filter(
      (report) => report.id !== id
    );

  if (
    registry.reports.length === originalLength
  ) {
    return false;
  }

  writeRegistry(registry);

  return true;
}

export function getCyberLabReportRegistryPath(): string {
  return REGISTRY_FILE;
}

// ============================================================
// REPORT AI EXPORTERS
// ============================================================

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();

  return `"${text.replace(/"/g, '""')}"`;
}

function getReportFindings(
  report: CyberLabReportRecord
): Array<Record<string, unknown>> {
  const data = report.reportData;

  if (
    data &&
    typeof data === "object" &&
    "findings" in data &&
    Array.isArray(
      (data as { findings?: unknown }).findings
    )
  ) {
    return (
      (data as {
        findings: Array<Record<string, unknown>>;
      }).findings || []
    );
  }

  return [];
}

export function exportCyberLabReportJson(
  report: CyberLabReportRecord
): string {
  return JSON.stringify(report, null, 2);
}

export function exportCyberLabReportMarkdown(
  report: CyberLabReportRecord
): string {
  const findings = getReportFindings(report);

  const lines: string[] = [
    `# ${report.title}`,
    "",
    "## Report Metadata",
    "",
    `- **Report ID:** ${report.id}`,
    `- **Source:** ${report.source}`,
    `- **Target:** ${report.target || "N/A"}`,
    `- **Scan ID:** ${report.scanId || "N/A"}`,
    `- **Generated:** ${report.generatedAt}`,
    `- **Risk Level:** ${report.overallRiskLevel}`,
    `- **Risk Score:** ${
      typeof report.riskScore === "number"
        ? `${report.riskScore}/100`
        : "N/A"
    }`,
    `- **Findings:** ${report.findingCount}`,
    `- **Hosts:** ${report.hostCount ?? "N/A"}`,
    `- **Open Ports:** ${report.openPortCount ?? "N/A"}`,
    "",
    "## Executive Summary",
    "",
    report.summary || "No executive summary available.",
    "",
    "## Findings",
    "",
  ];

  if (findings.length === 0) {
    lines.push("No findings were recorded.");
  } else {
    findings.forEach((finding, index) => {
      const title =
        String(
          finding.title ||
            finding.name ||
            `Finding ${index + 1}`
        );

      const severity =
        String(
          finding.severity ||
            finding.risk ||
            "Unknown"
        );

      const target =
        String(
          finding.target ||
            finding.host ||
            "N/A"
        );

      const category =
        String(
          finding.category ||
            "N/A"
        );

      const description =
        String(
          finding.description ||
            finding.details ||
            ""
        );

      const remediation =
        String(
          finding.remediationAdvice ||
            finding.remediation ||
            finding.recommendation ||
            ""
        );

      lines.push(
        `### ${index + 1}. ${title}`,
        "",
        `- **Severity:** ${severity}`,
        `- **Target:** ${target}`,
        `- **Category:** ${category}`,
      );

      if (description) {
        lines.push(
          "",
          "**Description**",
          "",
          description,
        );
      }

      if (remediation) {
        lines.push(
          "",
          "**Remediation**",
          "",
          remediation,
        );
      }

      lines.push("");
    });
  }

  lines.push(
    "## Report AI Registry",
    "",
    `Generated by Kali CyberLab Report AI on ${new Date().toISOString()}.`,
    "",
  );

  return lines.join("\n");
}

export function exportCyberLabReportHtml(
  report: CyberLabReportRecord
): string {
  const findings = getReportFindings(report);

  const findingsHtml =
    findings.length === 0
      ? "<p>No findings were recorded.</p>"
      : findings
          .map((finding, index) => {
            const title =
              finding.title ||
              finding.name ||
              `Finding ${index + 1}`;

            const severity =
              finding.severity ||
              finding.risk ||
              "Unknown";

            const target =
              finding.target ||
              finding.host ||
              "N/A";

            const category =
              finding.category ||
              "N/A";

            const description =
              finding.description ||
              finding.details ||
              "";

            const remediation =
              finding.remediationAdvice ||
              finding.remediation ||
              finding.recommendation ||
              "";

            return `
              <article class="finding">
                <h3>${escapeHtml(
                  title
                )}</h3>

                <p>
                  <strong>Severity:</strong>
                  ${escapeHtml(severity)}
                  &nbsp; | &nbsp;
                  <strong>Target:</strong>
                  ${escapeHtml(target)}
                  &nbsp; | &nbsp;
                  <strong>Category:</strong>
                  ${escapeHtml(category)}
                </p>

                ${
                  description
                    ? `
                      <h4>Description</h4>
                      <p>${escapeHtml(
                        description
                      )}</p>
                    `
                    : ""
                }

                ${
                  remediation
                    ? `
                      <h4>Remediation</h4>
                      <p>${escapeHtml(
                        remediation
                      )}</p>
                    `
                    : ""
                }
              </article>
            `;
          })
          .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(report.title)}</title>
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.6;
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px;
    color: #172033;
    background: #f5f7fa;
  }

  header,
  section,
  article {
    background: #ffffff;
    border: 1px solid #dce2ea;
    border-radius: 10px;
    padding: 22px;
    margin-bottom: 18px;
  }

  h1 {
    margin-top: 0;
  }

  h2 {
    margin-top: 0;
  }

  .metadata {
    display: grid;
    grid-template-columns: repeat(
      auto-fit,
      minmax(220px, 1fr)
    );
    gap: 12px;
  }

  .metadata div {
    padding: 12px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .finding {
    margin-top: 14px;
  }

  .finding h3 {
    margin-top: 0;
  }

  footer {
    color: #64748b;
    font-size: 13px;
    margin-top: 24px;
  }
</style>
</head>
<body>

<header>
  <h1>${escapeHtml(report.title)}</h1>

  <div class="metadata">
    <div><strong>Report ID</strong><br>${escapeHtml(
      report.id
    )}</div>
    <div><strong>Source</strong><br>${escapeHtml(
      report.source
    )}</div>
    <div><strong>Target</strong><br>${escapeHtml(
      report.target || "N/A"
    )}</div>
    <div><strong>Generated</strong><br>${escapeHtml(
      report.generatedAt
    )}</div>
    <div><strong>Risk Level</strong><br>${escapeHtml(
      report.overallRiskLevel
    )}</div>
    <div><strong>Risk Score</strong><br>${
      typeof report.riskScore === "number"
        ? `${report.riskScore}/100`
        : "N/A"
    }</div>
    <div><strong>Findings</strong><br>${report.findingCount}</div>
    <div><strong>Hosts</strong><br>${report.hostCount ?? "N/A"}</div>
    <div><strong>Open Ports</strong><br>${report.openPortCount ?? "N/A"}</div>
  </div>
</header>

<section>
  <h2>Executive Summary</h2>
  <p>${escapeHtml(
    report.summary ||
      "No executive summary available."
  )}</p>
</section>

<section>
  <h2>Findings</h2>
  ${findingsHtml}
</section>

<footer>
  Generated by Kali CyberLab Report AI.
</footer>

</body>
</html>`;
}


function getSeverityCounts(
  findings: Array<Record<string, unknown>>
): Record<string, number> {
  const counts: Record<string, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
    Informational: 0,
    Unknown: 0,
  };

  for (const finding of findings) {
    const raw = String(
      finding.severity ||
        finding.risk ||
        "Unknown"
    ).trim();

    const normalized =
      raw.charAt(0).toUpperCase() +
      raw.slice(1).toLowerCase();

    if (normalized === "Critical") {
      counts.Critical++;
    } else if (normalized === "High") {
      counts.High++;
    } else if (normalized === "Medium") {
      counts.Medium++;
    } else if (normalized === "Low") {
      counts.Low++;
    } else if (
      normalized === "Informational" ||
      normalized === "Info"
    ) {
      counts.Informational++;
    } else {
      counts.Unknown++;
    }
  }

  return counts;
}

function getFindingText(
  finding: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = finding[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return "";
}

function getReportRemediation(
  report: CyberLabReportRecord
): Array<{
  phase: string;
  priority: string;
  action: string;
  commands: string[];
}> {
  const data = report.reportData;

  if (!data || typeof data !== "object") {
    return [];
  }

  const roadmap =
    (data as {
      remediationRoadmap?: unknown;
    }).remediationRoadmap;

  if (!Array.isArray(roadmap)) {
    return [];
  }

  return roadmap
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(
          item &&
          typeof item === "object"
        )
    )
    .map((item) => ({
      phase: String(
        item.phase || "Remediation"
      ),
      priority: String(
        item.priority || "Standard Hygiene"
      ),
      action: String(
        item.action || ""
      ),
      commands: Array.isArray(
        item.commands
      )
        ? item.commands.map(String)
        : [],
    }));
}

function cleanPdfText(value: string): string {
  return String(value || "")
    .replace(/defensiveperspective/gi, "defensive perspective")
    .replace(/withinthe/gi, "within the")
    .replace(/roadmap,and/gi, "roadmap, and")
    .replace(/HTTPS\.Enable/gi, "HTTPS. Enable")
    .replace(/HTTP\.Enable/gi, "HTTP. Enable")
    .replace(/\.Enable/gi, ". Enable")
    .replace(/\.Restrict/gi, ". Restrict")
    .replace(/\.Configure/gi, ". Configure")
    .replace(/\.Keep/gi, ". Keep")
    .replace(/\.Ensure/gi, ". Ensure")
    .replace(/\.Use/gi, ". Use")
    .replace(/\.Bind/gi, ". Bind")
    .replace(/\.Monitor/gi, ". Monitor")
    .replace(/\.Review/gi, ". Review");
}

function buildCyberLabPdfHtml(
  report: CyberLabReportRecord
): string {
  const findings = getReportFindings(report);
  const severityCounts =
    getSeverityCounts(findings);
  const remediation =
    getReportRemediation(report);

  const generatedDate =
    new Date(report.generatedAt);

  const generatedLabel =
    Number.isNaN(generatedDate.getTime())
      ? report.generatedAt
      : generatedDate.toLocaleString(
          "en-GB",
          {
            dateStyle: "medium",
            timeStyle: "short",
          }
        );

  const riskScore =
    typeof report.riskScore === "number"
      ? `${report.riskScore}/100`
      : "N/A";

  const riskClass =
    report.overallRiskLevel
      .toLowerCase()
      .replace(/[^a-z]+/g, "-");

  const findingRows =
    findings.length === 0
      ? `
        <tr>
          <td colspan="5" class="empty">
            No findings were recorded for this assessment.
          </td>
        </tr>
      `
      : findings
          .map((finding, index) => {
            const title = cleanPdfText(
              getFindingText(
                finding,
                "title",
                "name"
              ) ||
              `Finding ${index + 1}`
            );

            const severity = cleanPdfText(
              getFindingText(
                finding,
                "severity",
                "risk"
              ) || "Unknown"
            );

            const target = cleanPdfText(
              getFindingText(
                finding,
                "target",
                "host"
              ) || "N/A"
            );

            const category = cleanPdfText(
              getFindingText(
                finding,
                "category"
              ) || "N/A"
            );

            const cvss =
              getFindingText(
                finding,
                "cvss",
                "cvssScore"
              ) || "N/A";

            return `
              <tr>
                <td>
                  <strong>${escapeHtml(title)}</strong>
                </td>
                <td>
                  <span class="severity severity-${escapeHtml(
                    severity.toLowerCase()
                  )}">
                    ${escapeHtml(severity)}
                  </span>
                </td>
                <td>${escapeHtml(target)}</td>
                <td>${escapeHtml(category)}</td>
                <td>${escapeHtml(cvss)}</td>
              </tr>
            `;
          })
          .join("");

  const findingDetails =
    findings.length === 0
      ? `
        <div class="empty-panel">
          <strong>No detailed findings available.</strong>
          <p>
            The assessment did not record any vulnerability
            findings requiring remediation.
          </p>
        </div>
      `
      : findings
          .map((finding, index) => {
            const title =
              getFindingText(
                finding,
                "title",
                "name"
              ) ||
              `Finding ${index + 1}`;

            const severity =
              getFindingText(
                finding,
                "severity",
                "risk"
              ) || "Unknown";

            const target =
              getFindingText(
                finding,
                "target",
                "host"
              ) || "N/A";

            const hostname =
              getFindingText(
                finding,
                "hostname"
              ) || "";

            const port =
              getFindingText(
                finding,
                "port"
              ) || "";

            const category =
              getFindingText(
                finding,
                "category"
              ) || "N/A";

            const description = cleanPdfText(
              getFindingText(
                finding,
                "description",
                "details"
              )
            );

            const remediationText = cleanPdfText(
              getFindingText(
                finding,
                "remediationAdvice",
                "remediation",
                "recommendation"
              )
            );

            const evidence = cleanPdfText(
              getFindingText(
                finding,
                "evidence",
                "rawEvidence"
              )
            );

            const cvss =
              getFindingText(
                finding,
                "cvss",
                "cvssScore",
                "severityScore"
              );

            return `
              <article class="finding-detail">
                <div class="finding-heading">
                  <div>
                    <div class="finding-number">
                      FINDING ${index + 1}
                    </div>
                    <h3>${escapeHtml(title)}</h3>
                  </div>

                  <span class="severity severity-${escapeHtml(
                    severity.toLowerCase()
                  )}">
                    ${escapeHtml(severity)}
                  </span>
                </div>

                <div class="detail-grid">
                  <div>
                    <span class="label">Target</span>
                    <strong>${escapeHtml(target)}</strong>
                  </div>

                  <div>
                    <span class="label">Category</span>
                    <strong>${escapeHtml(category)}</strong>
                  </div>

                  <div>
                    <span class="label">CVSS</span>
                    <strong>${escapeHtml(
                      cvss || "N/A"
                    )}</strong>
                  </div>

                  <div>
                    <span class="label">Host</span>
                    <strong>${escapeHtml(
                      target || "N/A"
                    )}</strong>
                  </div>

                  ${
                    hostname
                      ? `
                        <div>
                          <span class="label">Hostname</span>
                          <strong>${escapeHtml(
                            hostname
                          )}</strong>
                        </div>
                      `
                      : ""
                  }

                  ${
                    port
                      ? `
                        <div>
                          <span class="label">Port</span>
                          <strong>${escapeHtml(
                            port
                          )}</strong>
                        </div>
                      `
                      : ""
                  }
                </div>

                ${
                  description
                    ? `
                      <div class="text-section">
                        <h4>Description</h4>
                        <p>${escapeHtml(
                          description
                        )}</p>
                      </div>
                    `
                    : ""
                }

                ${
                  evidence
                    ? `
                      <div class="evidence">
                        <h4>Evidence</h4>
                        <pre>${escapeHtml(
                          evidence
                        )}</pre>
                      </div>
                    `
                    : ""
                }

                ${
                  remediationText
                    ? `
                      <div class="remediation">
                        <h4>Recommended Remediation</h4>
                        <p>${escapeHtml(
                          remediationText
                        )}</p>
                      </div>
                    `
                    : ""
                }
              </article>
            `;
          })
          .join("");

  const fallbackRemediation =
    remediation.length === 0
      ? findings
          .map((finding, index) => {
            const title = cleanPdfText(
              getFindingText(
                finding,
                "title",
                "name"
              ) ||
              `Finding ${index + 1}`
            );

            const severity = cleanPdfText(
              getFindingText(
                finding,
                "severity",
                "risk"
              ) || "Unknown"
            );

            const target = cleanPdfText(
              getFindingText(
                finding,
                "target",
                "host"
              ) || "N/A"
            );

            const advice = cleanPdfText(
              getFindingText(
                finding,
                "remediationAdvice",
                "remediation",
                "recommendation"
              )
            );

            return {
              phase: "Finding Remediation",
              priority:
                /critical/i.test(severity)
                  ? "Immediate (0-24h)"
                  : /high/i.test(severity)
                    ? "High (1-3 days)"
                    : /medium/i.test(severity)
                      ? "Medium (1 week)"
                      : "Standard Hygiene",
              action:
                advice ||
                `Address ${title} affecting ${target}.`,
              commands: [],
            };
          })
      : [];

  const effectiveRemediation =
    remediation.length > 0
      ? remediation
      : fallbackRemediation;

  const remediationHtml =
    effectiveRemediation.length === 0
      ? `
        <div class="empty-panel">
          <strong>No remediation actions were generated.</strong>
          <p>
            This assessment did not contain findings requiring
            remediation planning.
          </p>
        </div>
      `
      : effectiveRemediation
          .map(
            (item, index) => `
              <article class="roadmap-item">
                <div class="roadmap-number">
                  ${index + 1}
                </div>

                <div class="roadmap-content">
                  <div class="roadmap-meta">
                    <span>${escapeHtml(
                      item.phase
                    )}</span>
                    <span>${escapeHtml(
                      item.priority
                    )}</span>
                  </div>

                  <h3>${escapeHtml(
                    item.action
                  )}</h3>

                  ${
                    item.commands.length
                      ? `
                        <pre>${escapeHtml(
                          item.commands.join("\n")
                        )}</pre>
                      `
                      : ""
                  }
                </div>
              </article>
            `
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(report.title)}</title>

<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;

    @bottom-left {
      content: "Kali CyberLab • Report AI";
      color: #64748b;
      font-size: 8pt;
    }

    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      color: #64748b;
      font-size: 8pt;
    }
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  body {
    font-family:
      Arial,
      Helvetica,
      sans-serif;
    color: #172033;
    background: #ffffff;
    font-size: 9.5pt;
    line-height: 1.55;
  }

  .cover {
    min-height: 245mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12mm 8mm;
    page-break-after: always;
  }

  .brand {
    font-size: 10pt;
    font-weight: 800;
    letter-spacing: 2px;
    color: #0f766e;
    text-transform: uppercase;
  }

  .cover-line {
    width: 55mm;
    height: 3px;
    background: #0f766e;
    margin: 8mm 0 16mm;
  }

  .cover h1 {
    font-size: 28pt;
    line-height: 1.15;
    margin: 0 0 8mm;
    color: #0f172a;
  }

  .cover-subtitle {
    color: #475569;
    font-size: 12pt;
    max-width: 145mm;
  }

  .cover-risk {
    display: inline-block;
    margin-top: 15mm;
    padding: 5mm 8mm;
    border: 1px solid #cbd5e1;
    border-radius: 4mm;
    background: #f8fafc;
  }

  .cover-risk-label {
    font-size: 8pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cover-risk-value {
    font-size: 18pt;
    font-weight: 800;
    margin-top: 1mm;
  }

  .cover-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
    margin-top: 14mm;
  }

  .cover-meta-item {
    padding: 4mm;
    border: 1px solid #e2e8f0;
    border-radius: 2mm;
    background: #f8fafc;
  }

  .cover-meta-item span {
    display: block;
    color: #64748b;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: .7px;
    margin-bottom: 1mm;
  }

  .cover-meta-item strong {
    word-break: break-word;
  }

  .cover-footer {
    color: #64748b;
    font-size: 8pt;
  }

  .section {
    margin-bottom: 10mm;
  }

  .section-title {
    color: #0f172a;
    font-size: 16pt;
    margin: 0 0 5mm;
    padding-bottom: 2.5mm;
    border-bottom: 2px solid #0f766e;
  }

  .section-subtitle {
    color: #334155;
    font-size: 11pt;
    margin: 6mm 0 3mm;
  }

  .summary {
    padding: 6mm;
    border: 1px solid #dbe4ea;
    border-left: 4px solid #0f766e;
    background: #f8fafc;
    border-radius: 2mm;
  }

  .summary p {
    margin: 0;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
    margin: 5mm 0 8mm;
  }

  .stat {
    padding: 4mm;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 2mm;
  }

  .stat-label {
    display: block;
    font-size: 7pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .6px;
  }

  .stat-value {
    display: block;
    margin-top: 1mm;
    font-size: 16pt;
    font-weight: 800;
  }

  .risk-critical { color: #991b1b; }
  .risk-high { color: #c2410c; }
  .risk-medium { color: #a16207; }
  .risk-low { color: #15803d; }
  .risk-secure { color: #047857; }

  .metadata {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4mm;
  }

  .metadata td {
    border-bottom: 1px solid #e2e8f0;
    padding: 2.5mm 2mm;
    vertical-align: top;
  }

  .metadata td:first-child {
    width: 38%;
    color: #64748b;
    font-weight: 700;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    overflow-wrap: anywhere;
    word-break: normal;
  }

  thead {
    display: table-header-group;
  }

  th {
    text-align: left;
    padding: 3mm 2mm;
    background: #0f172a;
    color: #ffffff;
    font-size: 7.5pt;
  }

  td {
    padding: 3mm 2.8mm;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
    font-size: 8pt;
    line-height: 1.45;
  }

  th {
    padding-left: 2.8mm;
    padding-right: 2.8mm;
  }

  .finding-table th:nth-child(1),
  .finding-table td:nth-child(1) {
    width: 35%;
  }

  .finding-table th:nth-child(2),
  .finding-table td:nth-child(2) {
    width: 13%;
  }

  .finding-table th:nth-child(3),
  .finding-table td:nth-child(3) {
    width: 20%;
  }

  .finding-table th:nth-child(4),
  .finding-table td:nth-child(4) {
    width: 20%;
  }

  .finding-table th:nth-child(5),
  .finding-table td:nth-child(5) {
    width: 12%;
    text-align: center;
  }

  tr {
    page-break-inside: avoid;
  }

  .severity {
    display: inline-block;
    padding: 1mm 2.5mm;
    border-radius: 3mm;
    font-size: 7pt;
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .severity-critical {
    background: #fee2e2;
    color: #991b1b;
  }

  .severity-high {
    background: #ffedd5;
    color: #9a3412;
  }

  .severity-medium {
    background: #fef3c7;
    color: #92400e;
  }

  .severity-low {
    background: #dcfce7;
    color: #166534;
  }

  .severity-informational {
    background: #e0f2fe;
    color: #075985;
  }

  .severity-unknown {
    background: #e2e8f0;
    color: #475569;
  }

  .finding-detail {
    border: 1px solid #dbe4ea;
    border-radius: 2mm;
    padding: 5mm;
    margin-bottom: 5mm;
    page-break-inside: avoid;
  }

  .finding-heading {
    display: flex;
    justify-content: space-between;
    gap: 5mm;
    align-items: flex-start;
  }

  .finding-heading h3 {
    margin: 1mm 0 0;
    font-size: 12pt;
  }

  .finding-number {
    color: #0f766e;
    font-size: 7pt;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr .7fr;
    gap: 3mm;
    margin-top: 5mm;
  }

  .detail-grid > div {
    background: #f8fafc;
    padding: 3.5mm;
    border-radius: 1.5mm;
    min-width: 0;
  }

  .detail-grid strong {
    display: block;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.35;
  }

  .label {
    display: block;
    color: #64748b;
    font-size: 7pt;
    text-transform: uppercase;
    margin-bottom: 1mm;
  }

  .text-section {
    margin-top: 5mm;
  }

  .text-section h4,
  .evidence h4,
  .remediation h4 {
    margin: 0 0 2mm;
    font-size: 9pt;
  }

  .text-section p,
  .remediation p {
    margin: 0;
  }

  .evidence {
    margin-top: 5mm;
    padding: 4mm;
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 2mm;
  }

  .evidence h4 {
    color: #94a3b8;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family:
      "DejaVu Sans Mono",
      "Liberation Mono",
      monospace;
    font-size: 7.5pt;
    margin: 0;
  }

  .remediation {
    margin-top: 5mm;
    padding: 4mm;
    background: #ecfdf5;
    border-left: 3px solid #0f766e;
    border-radius: 1mm;
  }

  .roadmap-item {
    display: flex;
    gap: 4mm;
    border: 1px solid #dbe4ea;
    padding: 4.5mm;
    margin-bottom: 4mm;
    border-radius: 2mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .roadmap-content h3 {
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .roadmap-number {
    flex: 0 0 9mm;
    height: 9mm;
    border-radius: 50%;
    background: #0f766e;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .roadmap-content {
    flex: 1;
  }

  .roadmap-meta {
    display: flex;
    gap: 3mm;
    color: #64748b;
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: .5px;
  }

  .roadmap-content h3 {
    margin: 1.5mm 0 3mm;
    font-size: 10pt;
  }

  .roadmap-content pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 3mm;
    border-radius: 1mm;
  }

  .appendix {
    page-break-before: always;
  }

  .empty,
  .empty-panel {
    color: #64748b;
    text-align: center;
  }

  .empty-panel {
    padding: 10mm;
    border: 1px dashed #cbd5e1;
    border-radius: 2mm;
  }

  .classification {
    margin-top: 8mm;
    padding: 4mm;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 7.5pt;
  }
</style>
</head>

<body>

<section class="cover">
  <div>
    <div class="brand">Kali CyberLab • Report AI</div>
    <div class="cover-line"></div>

    <h1>${escapeHtml(report.title)}</h1>

    <p class="cover-subtitle">
      Security assessment report generated from the
      CyberLab report-management and analysis pipeline.
    </p>

    <div class="cover-risk">
      <div class="cover-risk-label">
        Overall Risk
      </div>
      <div class="cover-risk-value risk-${escapeHtml(
        riskClass
      )}">
        ${escapeHtml(report.overallRiskLevel)}
        ${
          typeof report.riskScore === "number"
            ? ` • ${escapeHtml(riskScore)}`
            : ""
        }
      </div>
    </div>

    <div class="cover-meta">
      <div class="cover-meta-item">
        <span>Report ID</span>
        <strong>${escapeHtml(report.id)}</strong>
      </div>

      <div class="cover-meta-item">
        <span>Source</span>
        <strong>${escapeHtml(report.source)}</strong>
      </div>

      <div class="cover-meta-item">
        <span>Target</span>
        <strong>${escapeHtml(
          report.target || "N/A"
        )}</strong>
      </div>

      <div class="cover-meta-item">
        <span>Generated</span>
        <strong>${escapeHtml(
          generatedLabel
        )}</strong>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    Confidential security assessment • Generated by Kali CyberLab Report AI
  </div>
</section>


<section class="section">
  <h2 class="section-title">
    1. Executive Summary
  </h2>

  <div class="summary">
    <p>${escapeHtml(
      cleanPdfText(
        report.summary ||
          "No executive summary was supplied with this report."
      )
    )}</p>
  </div>

  <div class="stats">
    <div class="stat">
      <span class="stat-label">Total Findings</span>
      <span class="stat-value">${report.findingCount}</span>
    </div>

    <div class="stat">
      <span class="stat-label">Critical / High</span>
      <span class="stat-value risk-critical">
        ${severityCounts.Critical + severityCounts.High}
      </span>
    </div>

    <div class="stat">
      <span class="stat-label">Medium</span>
      <span class="stat-value risk-medium">
        ${severityCounts.Medium}
      </span>
    </div>

    <div class="stat">
      <span class="stat-label">Low / Info</span>
      <span class="stat-value risk-low">
        ${severityCounts.Low + severityCounts.Informational}
      </span>
    </div>
  </div>
</section>


<section class="section">
  <h2 class="section-title">
    2. Assessment Scope & Metadata
  </h2>

  <table class="metadata">
    <tbody>
      <tr>
        <td>Report ID</td>
        <td>${escapeHtml(report.id)}</td>
      </tr>

      <tr>
        <td>Report Source</td>
        <td>${escapeHtml(report.source)}</td>
      </tr>

      <tr>
        <td>Target</td>
        <td>${escapeHtml(
          report.target || "N/A"
        )}</td>
      </tr>

      <tr>
        <td>Scan ID</td>
        <td>${escapeHtml(
          report.scanId || "N/A"
        )}</td>
      </tr>

      <tr>
        <td>Generated</td>
        <td>${escapeHtml(
          generatedLabel
        )}</td>
      </tr>

      <tr>
        <td>Overall Risk</td>
        <td>${escapeHtml(
          report.overallRiskLevel
        )}</td>
      </tr>

      <tr>
        <td>Risk Score</td>
        <td>${escapeHtml(riskScore)}</td>
      </tr>

      <tr>
        <td>Hosts Scanned</td>
        <td>${escapeHtml(
          report.hostCount ?? "N/A"
        )}</td>
      </tr>

      <tr>
        <td>Open Ports</td>
        <td>${escapeHtml(
          report.openPortCount ?? "N/A"
        )}</td>
      </tr>

      <tr>
        <td>Finding Count</td>
        <td>${report.findingCount}</td>
      </tr>
    </tbody>
  </table>
</section>


<section class="section">
  <h2 class="section-title">
    3. Risk Overview
  </h2>

  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Finding Count</th>
        <th>Assessment Share</th>
      </tr>
    </thead>

    <tbody>
      ${[
        ["Critical", severityCounts.Critical],
        ["High", severityCounts.High],
        ["Medium", severityCounts.Medium],
        ["Low", severityCounts.Low],
        ["Informational", severityCounts.Informational],
        ["Unknown", severityCounts.Unknown],
      ]
        .map(([severity, count]) => {
          const percentage =
            findings.length > 0
              ? Math.round(
                  (Number(count) /
                    findings.length) *
                    100
                )
              : 0;

          return `
            <tr>
              <td>
                <span class="severity severity-${String(
                  severity
                ).toLowerCase()}">
                  ${escapeHtml(severity)}
                </span>
              </td>
              <td>${count}</td>
              <td>${percentage}%</td>
            </tr>
          `;
        })
        .join("")}
    </tbody>
  </table>
</section>


<section class="section">
  <h2 class="section-title">
    4. Findings Overview
  </h2>

  <table class="finding-table">
    <thead>
      <tr>
        <th>Finding</th>
        <th>Severity</th>
        <th>Target</th>
        <th>Category</th>
        <th>CVSS</th>
      </tr>
    </thead>

    <tbody>
      ${findingRows}
    </tbody>
  </table>
</section>


<section class="section">
  <h2 class="section-title">
    5. Detailed Findings
  </h2>

  ${findingDetails}
</section>


<section class="section">
  <h2 class="section-title">
    6. Remediation Roadmap
  </h2>

  ${remediationHtml}
</section>


<section class="section appendix">
  <h2 class="section-title">
    7. Report Appendix
  </h2>

  <h3 class="section-subtitle">
    Report Classification
  </h3>

  <p>
    This document was generated from the normalized
    Kali CyberLab Report AI registry. It is intended to
    provide a structured representation of the security
    assessment and its associated findings.
  </p>

  <h3 class="section-subtitle">
    Report Integrity & Traceability
  </h3>

  <table class="metadata">
    <tbody>
      <tr>
        <td>Report ID</td>
        <td>${escapeHtml(report.id)}</td>
      </tr>

      <tr>
        <td>Registry Source</td>
        <td>Kali CyberLab Report AI</td>
      </tr>

      <tr>
        <td>Generated At</td>
        <td>${escapeHtml(
          report.generatedAt
        )}</td>
      </tr>

      <tr>
        <td>Last Registry Update</td>
        <td>${escapeHtml(
          report.updatedAt
        )}</td>
      </tr>
    </tbody>
  </table>

  <div class="classification">
    This report contains security assessment information.
    Handle according to the organization's applicable
    information-security and data-handling requirements.
  </div>
</section>

</body>
</html>`;
}

export async function exportCyberLabReportPdf(
  report: CyberLabReportRecord
): Promise<Buffer> {
  const browser = await chromium.launch({
    executablePath:
      process.env.CYBERLAB_CHROMIUM_PATH ||
      "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1240,
        height: 1754,
      },
      deviceScaleFactor: 1,
    });

    await page.setContent(
      buildCyberLabPdfHtml(report),
      {
        waitUntil: "load",
      }
    );

    await page.emulateMedia({
      media: "print",
    });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "18mm",
        right: "16mm",
        bottom: "18mm",
        left: "16mm",
      },
    });
  } finally {
    await browser.close();
  }
}

export function exportCyberLabReportCsv(
  report: CyberLabReportRecord
): string {
  const findings = getReportFindings(report);

  const header = [
    "Report ID",
    "Report Title",
    "Source",
    "Target",
    "Generated At",
    "Risk Level",
    "Risk Score",
    "Finding Count",
    "Host Count",
    "Open Port Count",
    "Finding",
    "Severity",
    "Category",
    "Finding Target",
    "Description",
    "Remediation",
  ];

  const rows: string[][] = [];

  if (findings.length === 0) {
    rows.push([
      report.id,
      report.title,
      report.source,
      report.target || "",
      report.generatedAt,
      report.overallRiskLevel,
      String(report.riskScore ?? ""),
      String(report.findingCount),
      String(report.hostCount ?? ""),
      String(report.openPortCount ?? ""),
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  } else {
    for (const finding of findings) {
      rows.push([
        report.id,
        report.title,
        report.source,
        report.target || "",
        report.generatedAt,
        report.overallRiskLevel,
        String(report.riskScore ?? ""),
        String(report.findingCount),
        String(report.hostCount ?? ""),
        String(report.openPortCount ?? ""),
        String(
          finding.title ||
            finding.name ||
            ""
        ),
        String(
          finding.severity ||
            finding.risk ||
            ""
        ),
        String(
          finding.category ||
            ""
        ),
        String(
          finding.target ||
            finding.host ||
            ""
        ),
        String(
          finding.description ||
            finding.details ||
            ""
        ),
        String(
          finding.remediationAdvice ||
            finding.remediation ||
            finding.recommendation ||
            ""
        ),
      ]);
    }
  }

  return [
    header.map(escapeCsv).join(","),
    ...rows.map((row) =>
      row.map(escapeCsv).join(",")
    ),
  ].join("\n");
}

export async function exportCyberLabReport(
  report: CyberLabReportRecord,
  format: CyberLabReportFormat
): Promise<{
  content: string | Buffer;
  contentType: string;
  extension: string;
}> {
  switch (format) {
    case "json":
      return {
        content:
          exportCyberLabReportJson(report),
        contentType:
          "application/json; charset=utf-8",
        extension: "json",
      };

    case "markdown":
      return {
        content:
          exportCyberLabReportMarkdown(
            report
          ),
        contentType:
          "text/markdown; charset=utf-8",
        extension: "md",
      };

    case "html":
      return {
        content:
          exportCyberLabReportHtml(report),
        contentType:
          "text/html; charset=utf-8",
        extension: "html",
      };

    case "csv":
      return {
        content:
          exportCyberLabReportCsv(report),
        contentType:
          "text/csv; charset=utf-8",
        extension: "csv",
      };

    case "pdf":
      return {
        content:
          await exportCyberLabReportPdf(
            report
          ),
        contentType:
          "application/pdf",
        extension: "pdf",
      };

    case "excel":
      throw new Error(
        "The EXCEL exporter is not implemented yet."
      );

    default:
      throw new Error(
        `Unsupported report format: ${format}`
      );
  }
  }
