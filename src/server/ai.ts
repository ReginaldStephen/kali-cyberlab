import type { CyberLabAIProvider } from "./ai/provider";
import { recordCyberLabAIRequest } from "./ai/runtime";
import type { CyberLabAIResponse } from "../types/cyberlabAI";

type LiveContextProvider = () => Promise<unknown>;
type AIClientProvider = () => CyberLabAIProvider | null;

let liveContextProvider: LiveContextProvider | null = null;
let aiClientProvider: AIClientProvider | null = null;

export function registerCyberLabAIClientProvider(
  provider: AIClientProvider
): void {
  aiClientProvider = provider;
}

export function registerCyberLabLiveContextProvider(
  provider: LiveContextProvider
): void {
  liveContextProvider = provider;
}

function getLiveContextProvider(): LiveContextProvider {
  if (!liveContextProvider) {
    throw new Error(
      "CyberLab live context provider has not been registered."
    );
  }

  return liveContextProvider;
}

function buildCompactAIContext(liveContext: unknown): unknown {
  const context =
    liveContext && typeof liveContext === "object"
      ? (liveContext as Record<string, any>)
      : {};

  const compact = {
    generatedAt: context.generatedAt || null,

    events: {
      summary: context.events?.summary || null,
      recent: Array.isArray(context.events?.recent)
        ? context.events.recent.slice(0, 8).map((event: any) => ({
            id: event?.id || null,
            timestamp: event?.timestamp || null,
            type: event?.type || null,
            source: event?.source || null,
            severity: event?.severity || null,
            title: event?.title || null,
            message:
              typeof event?.message === "string"
                ? event.message.slice(0, 500)
                : null,
            target: event?.target || null,
          }))
        : [],
    },

    scans: {
      summary: context.scans?.summary || null,
      recent: Array.isArray(context.scans?.recent)
        ? context.scans.recent.slice(0, 8)
        : [],
    },

    network: {
      status: context.network?.status || "unknown",
      recentCount: context.network?.recentCount || 0,
      totalHosts: context.network?.totalHosts || 0,
      totalOpenPorts: context.network?.totalOpenPorts || 0,
      totalVulnerabilities:
        context.network?.totalVulnerabilities || 0,
      vulnerabilitiesBySeverity:
        context.network?.vulnerabilitiesBySeverity || null,
      recentScans: Array.isArray(context.network?.recentScans)
        ? context.network.recentScans.slice(0, 5)
        : [],
      hosts: Array.isArray(context.network?.hosts)
        ? context.network.hosts.slice(0, 5).map((host: any) => ({
            scanId: host?.scanId || null,
            timestamp: host?.timestamp || null,
            target: host?.target || null,
            ip: host?.ip || null,
            status: host?.status || null,
            latencyMs: host?.latencyMs || null,
            openPorts: Array.isArray(host?.openPorts)
              ? host.openPorts.slice(0, 10).map((port: any) => ({
                  port: port?.port || null,
                  protocol: port?.protocol || null,
                  service: port?.service || null,
                  state: port?.state || null,
                }))
              : [],
          }))
        : [],
    },

    web: {
      status: context.web?.status || "unknown",
      recentCount: context.web?.recentCount || 0,
      totalAudits: context.web?.totalAudits || 0,
      vulnerabilities: context.web?.vulnerabilities || 0,
      vulnerabilitiesBySeverity:
        context.web?.vulnerabilitiesBySeverity || null,
      recentAudits: Array.isArray(context.web?.recentAudits)
        ? context.web.recentAudits.slice(0, 5)
        : [],
      findings: Array.isArray(context.web?.findings)
        ? context.web.findings.slice(0, 8).map((finding: any) => ({
            title: finding?.title || null,
            severity: finding?.severity || null,
            target: finding?.target || null,
            category: finding?.category || null,
          }))
        : [],
    },

    reports: {
      status: context.reports?.status || "unknown",
      totalReports: context.reports?.totalReports || 0,
      recentReports: Array.isArray(context.reports?.recentReports)
        ? context.reports.recentReports.slice(0, 10).map((report: any) => ({
            id: report?.id || null,
            title: report?.title || null,
            source: report?.source || null,
            target: report?.target || null,
            scanId: report?.scanId || null,
            scannerReportId: report?.scannerReportId || null,
            generatedAt: report?.generatedAt || null,
            createdAt: report?.createdAt || null,
            overallRiskLevel:
              report?.overallRiskLevel || null,
            riskScore:
              report?.riskScore ?? null,
            findingCount:
              report?.findingCount ?? null,
            hostCount:
              report?.hostCount ?? null,
            openPortCount:
              report?.openPortCount ?? null,
          }))
        : [],
    },

    terminal: {
      status: context.terminal?.status || "unknown",
      recentCount: context.terminal?.recentCount || 0,
      successful: context.terminal?.successful || 0,
      failed: context.terminal?.failed || 0,
      recentExecutions: Array.isArray(
        context.terminal?.recentExecutions
      )
        ? context.terminal.recentExecutions
            .slice(0, 5)
            .map((execution: any) => ({
              id: execution?.id || null,
              timestamp: execution?.timestamp || null,
              command: execution?.command || null,
              target: execution?.target || null,
              status: execution?.status || null,
              durationMs: execution?.durationMs || null,
            }))
        : [],
    },

    vulnerabilities: {
      status: context.vulnerabilities?.status || "unknown",
      totalFindings: context.vulnerabilities?.totalFindings || 0,
      severity: context.vulnerabilities?.severity || null,
      affectedTargets:
        Array.isArray(context.vulnerabilities?.affectedTargets)
          ? context.vulnerabilities.affectedTargets.slice(0, 15)
          : [],
      affectedCategories:
        Array.isArray(context.vulnerabilities?.affectedCategories)
          ? context.vulnerabilities.affectedCategories.slice(0, 15)
          : [],
      risk: context.vulnerabilities?.risk
        ? {
            level:
              context.vulnerabilities.risk.level || null,
            score:
              context.vulnerabilities.risk.score ?? null,
            highestRiskFinding:
              context.vulnerabilities.risk.highestRiskFinding || null,
          }
        : null,
      recentFindings: Array.isArray(
        context.vulnerabilities?.recentFindings
      )
        ? context.vulnerabilities.recentFindings
            .slice(0, 10)
            .map((finding: any) => ({
              title: finding?.title || null,
              severity: finding?.severity || null,
              target: finding?.target || null,
              category: finding?.category || null,
              detectedVia: finding?.detectedVia || null,
              scanId: finding?.scanId || null,
            }))
        : [],
      remediation: context.vulnerabilities?.remediation
        ? {
            available:
              context.vulnerabilities.remediation.available || false,
            totalItems:
              context.vulnerabilities.remediation.totalItems || 0,
            items: Array.isArray(
              context.vulnerabilities.remediation.items
            )
              ? context.vulnerabilities.remediation.items
                  .slice(0, 8)
                  .map((item: any) => ({
                    title: item?.title || null,
                    severity: item?.severity || null,
                    target: item?.target || null,
                    category: item?.category || null,
                    action:
                      typeof item?.action === "string"
                        ? item.action.slice(0, 500)
                        : null,
                  }))
              : [],
          }
        : null,
    },

    defectdojo: {
      status: context.defectdojo?.status || "unknown",
      configured:
        context.defectdojo?.configured || false,
      reachable:
        context.defectdojo?.reachable || false,
      authenticated:
        context.defectdojo?.authenticated || false,
      totalFindings:
        context.defectdojo?.totalFindings || 0,
      severity:
        context.defectdojo?.severity || null,
      activeFindings:
        context.defectdojo?.activeFindings || 0,
      verifiedFindings:
        context.defectdojo?.verifiedFindings || 0,
      duplicateFindings:
        context.defectdojo?.duplicateFindings || 0,
      totalProducts:
        context.defectdojo?.totalProducts || 0,
      totalEngagements:
        context.defectdojo?.totalEngagements || 0,
      recentFindings: Array.isArray(
        context.defectdojo?.recentFindings
      )
        ? context.defectdojo.recentFindings
            .slice(0, 8)
            .map((finding: any) => ({
              id: finding?.id || null,
              title: finding?.title || null,
              severity: finding?.severity || null,
              active: finding?.active || false,
              verified: finding?.verified || false,
              duplicate: finding?.duplicate || false,
              status: finding?.status || null,
            }))
        : [],
    },

    greenbone: {
      status: context.greenbone?.status || "unknown",
      runningTasks:
        context.greenbone?.runningTasks || 0,
      totalTasks:
        context.greenbone?.totalTasks || 0,
      tasks: Array.isArray(context.greenbone?.tasks)
        ? context.greenbone.tasks.slice(0, 10).map((task: any) => ({
            id: task?.id || null,
            name: task?.name || null,
            status: task?.status || null,
            progress: task?.progress ?? null,
            reportId: task?.reportId || null,
          }))
        : [],
    },

    observium: {
      status: context.observium?.status || "unknown",
      totalDevices:
        context.observium?.totalDevices || 0,
      onlineDevices:
        context.observium?.onlineDevices || 0,
      offlineDevices:
        context.observium?.offlineDevices || 0,
      totalInterfaces:
        context.observium?.totalInterfaces || 0,
      interfacesUp:
        context.observium?.interfacesUp || 0,
      interfacesDown:
        context.observium?.interfacesDown || 0,
      interfacesWithErrors:
        context.observium?.interfacesWithErrors || 0,
      highUtilizationInterfaces:
        context.observium?.highUtilizationInterfaces || 0,
      activeAlerts:
        context.observium?.activeAlerts || 0,
    },

    tshark: {
      status: context.tshark?.status || "unknown",
      running: context.tshark?.running || false,
      interface: context.tshark?.interface || "",
      captureFilter:
        context.tshark?.captureFilter || "",
      displayFilter:
        context.tshark?.displayFilter || "",
      packetCount:
        context.tshark?.packetCount || 0,
      statistics: {
        packetCount:
          context.tshark?.statistics?.packetCount || 0,
        totalBytes:
          context.tshark?.statistics?.totalBytes || 0,
        protocols: Array.isArray(
          context.tshark?.statistics?.protocols
        )
          ? context.tshark.statistics.protocols.slice(0, 10)
          : [],
        topSources: Array.isArray(
          context.tshark?.statistics?.topSources
        )
          ? context.tshark.statistics.topSources.slice(0, 10)
          : [],
        topDestinations: Array.isArray(
          context.tshark?.statistics?.topDestinations
        )
          ? context.tshark.statistics.topDestinations.slice(0, 10)
          : [],
        topPorts: Array.isArray(
          context.tshark?.statistics?.topPorts
        )
          ? context.tshark.statistics.topPorts.slice(0, 10)
          : [],
      },
    },

    httpx: {
      status:
        context.httpx?.status || "unknown",
      totalResults:
        context.httpx?.totalResults || 0,
      recentResults:
        Array.isArray(
          context.httpx?.recentResults
        )
          ? context.httpx.recentResults
              .slice(0, 10)
              .map((result: any) => ({
                id: result?.id || null,
                timestamp:
                  result?.timestamp || null,
                target:
                  result?.target || null,
                url:
                  result?.url || null,
                finalUrl:
                  result?.finalUrl || null,
                statusCode:
                  result?.statusCode ?? null,
                contentLength:
                  result?.contentLength ?? null,
                contentType:
                  result?.contentType || null,
                title:
                  result?.title || null,
                webServer:
                  result?.webServer || null,
                method:
                  result?.method || null,
                technologies:
                  Array.isArray(
                    result?.technologies
                  )
                    ? result.technologies.slice(0, 20)
                    : [],
                responseTime:
                  result?.responseTime || null,
                ip:
                  result?.ip || null,
                ipv4:
                  Array.isArray(result?.ipv4)
                    ? result.ipv4.slice(0, 10)
                    : [],
                ipv6:
                  Array.isArray(result?.ipv6)
                    ? result.ipv6.slice(0, 10)
                    : [],
                cname:
                  result?.cname || null,
                cdn:
                  result?.cdn || null,
                location:
                  result?.location || null,
                probe:
                  result?.probe ?? null,
                redirectChain:
                  Array.isArray(result?.redirectChain)
                    ? result.redirectChain.slice(0, 10)
                    : [],
                http2:
                  result?.http2 ?? null,
                websocket:
                  result?.websocket ?? null,
                tls: result?.tls
                  ? {
                      host:
                        result.tls.host || null,
                      port:
                        result.tls.port || null,
                      probeStatus:
                        result.tls.probeStatus ?? null,
                      tlsVersion:
                        result.tls.tlsVersion || null,
                      cipher:
                        result.tls.cipher || null,
                      notBefore:
                        result.tls.notBefore || null,
                      notAfter:
                        result.tls.notAfter || null,
                      subjectCn:
                        result.tls.subjectCn || null,
                      issuerCn:
                        result.tls.issuerCn || null,
                      wildcardCertificate:
                        result.tls.wildcardCertificate ?? null,
                      sni:
                        result.tls.sni || null,
                    }
                  : null,
              }))
          : [],
    },

    telegram: {
      status: context.telegram?.status || "unknown",
      configured:
        context.telegram?.configured || false,
      listenerRunning:
        context.telegram?.listenerRunning || false,
      supportedCommands: Array.isArray(
        context.telegram?.supportedCommands
      )
        ? context.telegram.supportedCommands.slice(0, 20)
        : [],
    },

    system: context.system
      ? {
          hostname: context.system.hostname || null,
          platform: context.system.platform || null,
          release: context.system.release || null,
          arch: context.system.arch || null,
          uptime: context.system.uptimeFormatted || null,
          cores: context.system.cores || null,
          cpuUsagePercent:
            context.system.cpuUsagePercent ?? null,
          memoryUsagePercent:
            context.system.memoryUsagePercent ?? null,
          diskUsagePercent:
            context.system.diskUsagePercent ?? null,
        }
      : null,
  };

  return compact;
}

export async function generateCyberLabAIResponse(
  ai: CyberLabAIProvider | null,
  message: string,
  requestedModel?: string
): Promise<CyberLabAIResponse> {
  const resolvedAI = ai || aiClientProvider?.() || null;

  if (!resolvedAI) {
    throw new Error(
      "Gemini AI is not configured. Please check GEMINI_API_KEY."
    );
  }

  const trimmedMessage = message.trim();

  let liveContext: unknown;

  try {
    liveContext = await getLiveContextProvider()();
  } catch (contextError: any) {
    console.error(
      "CyberLab live context error:",
      contextError
    );

    liveContext = {
      status: "unavailable",
      error:
        contextError?.message ||
        "Live CyberLab context is temporarily unavailable.",
    };
  }

  const systemInstruction = `
You are CyberLab AI Security Buddy, an experienced defensive cybersecurity assistant supporting Security Technicians.

You are part of Kali CyberLab, a defensive security operations platform.

Your role is to:
- Explain cybersecurity concepts clearly.
- Help technicians understand security findings.
- Explain Greenbone/OpenVAS vulnerability results.
- Help interpret network scanning results.
- Help understand Observium monitoring information.
- Recommend defensive remediation and hardening.
- Assist with Kali Linux and Linux security troubleshooting.
- Explain CVEs, vulnerabilities, services, ports, and security risks.
- Provide practical, technically accurate guidance.

Always prioritize authorized, defensive security work.

When discussing commands:
- Explain what the command does.
- Prefer safe inspection and verification commands first.
- Clearly warn before commands that could modify systems.
- Never assume the technician is authorized to attack an external system.
- Do not provide instructions for credential theft, malware deployment, persistence, evasion, or unauthorized compromise.

Be concise but technically useful. If the technician's question is ambiguous, ask a focused clarification question.

CYBERLAB UI CONTROL:
You can request controlled CyberLab UI actions.

Allowed actions:
- OPEN_MODULE
- SELECT
- HIGHLIGHT
- SEND_REPORT_TELEGRAM

Allowed module values:
- home
- network
- web
- terminal
- remediation
- reports
- python
- migration
- activity
- arsenal
- observium
- greenbone
- tshark
- tools

SELECT targets:
- greenbone_report

HIGHLIGHT targets:
- greenbone_finding

When the technician asks you to open or navigate to a CyberLab module, include an OPEN_MODULE action using the correct module value.

When the technician asks to view, show, select, or open a specific Greenbone report, use a SELECT action with:
- type: "SELECT"
- target: "greenbone_report"
- id: the exact reportId from CURRENT CYBERLAB LIVE CONTEXT

Never invent a Greenbone report ID.
Use the Greenbone task name in the live context to resolve natural-language requests such as "Alert Test Scan" to its exact reportId.

Examples:
- "Open Greenbone" -> OPEN_MODULE with module "greenbone"
- "Show me TShark" -> OPEN_MODULE with module "tshark"
- "Open Security Arsenal" -> OPEN_MODULE with module "arsenal"
- "Take me to reports" -> OPEN_MODULE with module "reports"
- "Show me the Alert Test Scan report" -> SELECT target "greenbone_report" using the matching reportId from live context

TELEGRAM REPORT DELIVERY CAPABILITY:

CyberLab has a real server-side capability to send persisted CyberLab reports to the configured Telegram destination as PDF.

This is an EXECUTABLE CyberLab action, not a hypothetical UI action and not a capability that requires the technician to manually export or distribute the report.

When the technician asks to send a CyberLab report to Telegram as a PDF:
- DO NOT say that you cannot send reports to Telegram.
- DO NOT tell the technician to manually export, download, or distribute the report.
- DO NOT ask for a Telegram chat ID.
- DO NOT describe Telegram delivery as unavailable.
- Instead, emit the SEND_REPORT_TELEGRAM action when a matching real report exists in CURRENT CYBERLAB LIVE CONTEXT.
- The CyberLab server will perform the actual PDF export and Telegram delivery after the action is returned.

Use SEND_REPORT_TELEGRAM with:
- type: "SEND_REPORT_TELEGRAM"
- reportId: the exact CyberLab report id from CURRENT CYBERLAB LIVE CONTEXT

For "send the latest report to Telegram as PDF":
- Select the first/newest real report in reports.recentReports.
- Emit SEND_REPORT_TELEGRAM using that exact report id.
- Do not invent an id.

For a named report:
- Match the request against title and identifying fields in reports.recentReports.
- Emit SEND_REPORT_TELEGRAM using the exact matching report id.
- If no matching real report exists, explain that the requested report could not be found instead of inventing an id.

The following are valid examples:
- "Send the latest report to Telegram as PDF." -> SEND_REPORT_TELEGRAM using the newest real report id from reports.recentReports.
- "Send report-1789801200538 to Telegram as PDF." -> SEND_REPORT_TELEGRAM with reportId "report-1789801200538".
- "Send the Alert Test Scan report to Telegram as PDF." -> SEND_REPORT_TELEGRAM using the exact matching CyberLab report id from reports.recentReports.

When the technician asks to highlight a Greenbone vulnerability finding, use a HIGHLIGHT action with:
- type: "HIGHLIGHT"
- target: "greenbone_finding"
- field: one of "severity", "name", "host", "port", or "oid"
- value: the requested matching value

For severity requests, use the normalized severity value such as "Critical", "High", "Medium", or "Low".

Highlight examples:
- "Highlight the critical finding" -> HIGHLIGHT with field "severity" and value "Critical"
- "Highlight the high severity findings" -> HIGHLIGHT with field "severity" and value "High"
- "Highlight the finding on port 443" -> HIGHLIGHT with field "port" and value "443"

SEND_REPORT_TELEGRAM example:
- "Send the latest report to Telegram" -> SEND_REPORT_TELEGRAM using the newest real report id from reports.recentReports
- "Send the Alert Test Scan report to Telegram" -> SEND_REPORT_TELEGRAM using the exact matching CyberLab report id from reports.recentReports

You MUST respond as valid JSON only.
Do not wrap the JSON in markdown fences.
The JSON shape MUST be:

{
  "reply": "short natural-language response",
  "actions": []
}

Each action MUST be one of the explicitly allowed actions above.
Do not invent action types.
Do not include JavaScript.
Do not include executable code in actions.
If no UI action is required, return an empty actions array.

You are speaking directly to a Security Technician working inside CyberLab.
`;

  const contents = [
    {
      role: "user",
      parts: [
        {
          text:
            systemInstruction +
            "\n\nCURRENT CYBERLAB LIVE CONTEXT:\n" +
            "The following JSON represents the current " +
            "operational state of CyberLab. Use it when " +
            "answering questions about CyberLab activity, " +
            "scans, monitoring, vulnerabilities, system " +
            "health, or recent operations. Do not invent " +
            "values that are not present in this context. " +
            "If a section is unavailable or empty, say so " +
            "clearly.\n\n" +
            JSON.stringify(
              buildCompactAIContext(liveContext),
              null,
              2
            ) +
            "\n\nTechnician message:\n" +
            trimmedMessage,
        },
      ],
    },
  ];

  const promptText = contents[0]?.parts?.[0]?.text || "";

  console.info(
    `[CyberLab AI] Gemini prompt size: ${promptText.length} characters.`
  );

  const configuredModels = [...resolvedAI.models];

  if (
    requestedModel &&
    !configuredModels.includes(requestedModel)
  ) {
    throw Object.assign(
      new Error(
        `Unsupported AI model: ${requestedModel}`
      ),
      {
        status: 400,
      }
    );
  }

  const models = requestedModel
    ? [
        requestedModel,
        ...configuredModels.filter(
          (model) => model !== requestedModel
        ),
      ]
    : configuredModels;

  console.info(
    `[CyberLab AI] Model routing order: ${models.join(", ")}`
  );

  let response: any = null;
  let lastAIError: any = null;

  for (const model of models) {
    let attempt = 0;

    while (attempt < 2) {
      attempt += 1;

      try {
        response = await resolvedAI.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
          },
        });

        console.info(
          `[CyberLab AI] ${resolvedAI.displayName} response generated with model ${model}.`
        );

        console.info(
          `[CyberLab AI] ${resolvedAI.displayName} returned model version ` +
            `${response.model || "unknown"}.`
        );

        recordCyberLabAIRequest({
          providerId: resolvedAI.id,
          providerDisplayName: resolvedAI.displayName,
          requestedModel: model,
          returnedModel: response.model || null,
          attempt,
          success: true,
          statusCode: null,
        });

        break;
      } catch (error: any) {
        lastAIError = error;

        const status =
          typeof error?.status === "number"
            ? error.status
            : Number(error?.code);

        recordCyberLabAIRequest({
          providerId: resolvedAI.id,
          providerDisplayName: resolvedAI.displayName,
          requestedModel: model,
          returnedModel: null,
          attempt,
          success: false,
          statusCode: Number.isFinite(status) ? status : null,
          error:
            typeof error?.message === "string"
              ? error.message.slice(0, 500)
              : "AI request failed.",
        });

        const message =
          typeof error?.message === "string"
            ? error.message
            : "";

        const isRateLimited =
          status === 429 ||
          message.includes('"code":429') ||
          message.includes('"status":"RESOURCE_EXHAUSTED"');

        const isUnavailable =
          status === 503 ||
          message.includes('"code":503') ||
          message.includes('"status":"UNAVAILABLE"') ||
          message.toLowerCase().includes("high demand");

        console.warn(
          `[CyberLab AI] Gemini model ${model} failed ` +
            `(attempt ${attempt}/2, status ${status || "unknown"}).`
        );

        if (isRateLimited && attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (isUnavailable || isRateLimited) {
          break;
        }

        throw error;
      }
    }

    if (response) {
      break;
    }
  }

  if (!response) {
    throw lastAIError || new Error(
      "All configured AI models for this provider are currently unavailable."
    );
  }

  const rawText =
    response.text?.trim() ||
    "";

  try {
    const parsed = JSON.parse(rawText);

    const reply =
      typeof parsed?.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "I was unable to generate a response.";

    const actions = Array.isArray(parsed?.actions)
      ? parsed.actions.filter(
          (action: any) =>
            action &&
            (
              (
                action.type === "OPEN_MODULE" &&
                typeof action.module === "string" &&
                [
                  "home",
                  "network",
                  "web",
                  "terminal",
                  "remediation",
                  "reports",
                  "python",
                  "migration",
                  "activity",
                  "arsenal",
                  "observium",
                  "greenbone",
                  "tshark",
                  "tools",
                ].includes(action.module)
              ) ||
              (
                action.type === "SELECT" &&
                action.target === "greenbone_report" &&
                typeof action.id === "string" &&
                /^[0-9a-fA-F-]{36}$/.test(action.id)
              ) ||
              (
                action.type === "HIGHLIGHT" &&
                action.target === "greenbone_finding" &&
                [
                  "severity",
                  "name",
                  "host",
                  "port",
                  "oid",
                ].includes(action.field) &&
                typeof action.value === "string" &&
                action.value.trim().length > 0
              ) ||
              (
                action.type === "SEND_REPORT_TELEGRAM" &&
                typeof action.reportId === "string" &&
                action.reportId.trim().length > 0
              )
            )
        )
      : [];

    return {
      reply,
      actions,
    };
  } catch (parseError) {
    console.warn(
      "CyberLab AI returned non-JSON output; using safe text fallback."
    );

    return {
      reply:
        rawText ||
        "I was unable to generate a response.",
      actions: [],
    };
  }
}
