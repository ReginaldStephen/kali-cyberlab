import {
  sendTelegramMessage,
  sendTelegramDocument,
} from "./telegram";

import {
  getCyberLabAlerts,
  getCyberLabAlertStats,
  getCyberLabAlertById,
  updateCyberLabAlertStatus,
} from "./alertEngine";

import {
  generateCyberLabAIResponse,
} from "./ai";

import type { ScanRunRecord } from "../types";

import {
  getCyberLabReport,
  exportCyberLabReportPdf,
} from "./reportAI";

const TELEGRAM_API_BASE = "https://api.telegram.org";

let scanHistoryProvider: (() => ScanRunRecord[]) | null = null;

export function registerTelegramScanHistoryProvider(
  provider: () => ScanRunRecord[]
): void {
  scanHistoryProvider = provider;
}

export interface TelegramGreenboneTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  reportId: string | null;
}

let greenboneTaskProvider:
  (() => Promise<TelegramGreenboneTask[]>) | null = null;

export function registerTelegramGreenboneTaskProvider(
  provider: () => Promise<TelegramGreenboneTask[]>
): void {
  greenboneTaskProvider = provider;
}


export interface TelegramGreenboneScanRequest {
  name?: string;
  target: string;
}

export interface TelegramGreenboneScanResult {
  success: boolean;
  message: string;
  scan: {
    name: string;
    target: string;
    targetId: string;
    taskId: string;
    reportId: string | null;
    configId: string;
    scannerId: string;
  };
}

let greenboneScanProvider:
  ((request: TelegramGreenboneScanRequest) =>
    Promise<TelegramGreenboneScanResult>) | null = null;

export function registerTelegramGreenboneScanProvider(
  provider: (
    request: TelegramGreenboneScanRequest
  ) => Promise<TelegramGreenboneScanResult>
): void {
  greenboneScanProvider = provider;
}

export interface TelegramTSharkStatus {
  running: boolean;
  interface: string;
  packetCount: number;
  captureFilter: string;
  pid: number | null;
  startedAt: string | null;
}

export interface TelegramTSharkProvider {
  getStatus: () =>
    | TelegramTSharkStatus
    | Promise<TelegramTSharkStatus>;
  start: () =>
    | TelegramTSharkStatus
    | Promise<TelegramTSharkStatus>;
  stop: () =>
    | TelegramTSharkStatus
    | Promise<TelegramTSharkStatus>;
}

let tsharkProvider:
  TelegramTSharkProvider | null = null;

export function registerTelegramTSharkProvider(
  provider: TelegramTSharkProvider
): void {
  tsharkProvider = provider;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat?: {
      id?: number;
      type?: string;
    };
    from?: {
      id?: number;
      username?: string;
      first_name?: string;
    };
    text?: string;
  };
}

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const password = process.env.TELEGRAM_COMMAND_PASSWORD;

  if (!token || !password) {
    return null;
  }

  return {
    token,
    password,
  };
}

function authenticateCommand(
  lines: string[],
  password: string
): boolean {
  if (lines.length < 2) {
    return false;
  }

  return lines[1].trim() === password;
}

function getCommandText(text: string): string {
  return text
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
}

async function sendUnauthorizedMessage(
  chatId: number
): Promise<void> {
  const config = getTelegramConfig();

  if (!config) {
    return;
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            "🔒 CyberLab Security Bot\n\n" +
            "Unauthorized command.\n\n" +
            "Use the required two-line command format.",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "[Telegram Commands] Failed to send unauthorized response."
      );
    }
  } catch (error) {
    console.error(
      "[Telegram Commands] Unauthorized response failed:",
      error
    );
  }
}

const TELEGRAM_MESSAGE_LIMIT = 4000;

function splitTelegramMessage(text: string): string[] {
  if (text.length <= TELEGRAM_MESSAGE_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > TELEGRAM_MESSAGE_LIMIT) {
    let splitAt = remaining.lastIndexOf(
      "\n",
      TELEGRAM_MESSAGE_LIMIT
    );

    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf(
        " ",
        TELEGRAM_MESSAGE_LIMIT
      );
    }

    if (splitAt <= 0) {
      splitAt = TELEGRAM_MESSAGE_LIMIT;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

async function sendCommandResponse(
  chatId: number,
  text: string
): Promise<void> {
  const config = getTelegramConfig();

  if (!config) {
    return;
  }

  const chunks = splitTelegramMessage(text);

  for (const chunk of chunks) {
    try {
      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            disable_web_page_preview: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        console.error(
          "[Telegram Commands] Failed to send command response:",
          result
        );
      }
    } catch (error) {
      console.error(
        "[Telegram Commands] Command response failed:",
        error
      );
    }
  }
}

async function handleTelegramCommand(
  update: TelegramUpdate
): Promise<void> {
  const config = getTelegramConfig();

  if (!config) {
    console.warn(
      "[Telegram Commands] Configuration is missing."
    );
    return;
  }

  const message = update.message;

  if (!message?.chat?.id || !message.text) {
    return;
  }

  const chatId = message.chat.id;
  const lines = message.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!authenticateCommand(lines, config.password)) {
    await sendUnauthorizedMessage(chatId);
    return;
  }

  const command = getCommandText(lines[0]);

  console.log(
    `[Telegram Commands] Authenticated command: ${command} | chat=${chatId}`
  );

  switch (command) {
    case "/help": {
      await sendCommandResponse(
        chatId,
        [
          "🤖 CYBERLAB SECURITY OPERATIONS",
          "",
          "Available Commands:",
          "",
          "📊 MONITORING",
          "/status - CyberLab operational status",
          "/health - System health information",
          "/alerts - Active security alerts",
          "/scans - Recent scan activity",
          "",
          "📡 TSHARK / PACKET CAPTURE",
          "/tshark - Show TShark capture status",
          "/tshark start - Start packet capture",
          "/tshark stop - Stop packet capture",
          "",
          "🚨 ALERT MANAGEMENT",
          "/alerts - Show recent alerts and Alert IDs",
          "/alert <id> - Show alert details",
          "/alert <id> acknowledge - Acknowledge an alert",
          "/alert <id> resolve - Resolve an alert",
          "",
          "🛡 GREENBONE / OPENVAS",
          "/greenbone - Greenbone scan status",
          "/greenbone-scan <target> - Start a vulnerability scan",
          "",
          "📄 REPORTING",
          "/report <report-id> - Generate and send a downloadable PDF report",
          "",
          "🤖 CYBERLAB AI",
          "/ai <question> - Ask CyberLab AI",
          "",
          "ℹ️ HELP",
          "/help - Show all available commands",
          "",
          "Examples:",
          "/status",
          "/health",
          "/alerts",
          "/tshark",
          "/tshark start",
          "/tshark stop",
          "/scans",
          "/greenbone",
          "/greenbone-scan 45.222.128.31",
          "/report report-1789801200538",
          "/ai What is happening in CyberLab?",
          "",
          "🔐 All commands require the CyberLab command password.",
          "",
          "CyberLab Security Operations",
        ].join("\n")
      );

      return;
    }

    case "/ai": {
      const firstLine = lines[0].trim();
      const question = firstLine
        .slice("/ai".length)
        .trim();

      if (!question) {
        await sendCommandResponse(
          chatId,
          [
            "🤖 CYBERLAB AI",
            "",
            "Please include a question after /ai.",
            "",
            "Example:",
            "/ai What is happening in CyberLab?",
            "YOUR_PASSWORD",
          ].join("\n")
        );

        return;
      }

      if (question.length > 4000) {
        await sendCommandResponse(
          chatId,
          "🤖 Your AI question is too long. Please keep it under 4000 characters."
        );

        return;
      }

      try {
        const aiResponse =
          await generateCyberLabAIResponse(
            null,
            question
          );

        const reply =
          typeof aiResponse === "string"
            ? aiResponse
            : typeof aiResponse?.reply === "string"
              ? aiResponse.reply
              : "I was unable to generate a response.";

        await sendCommandResponse(
          chatId,
          [
            "🤖 CYBERLAB AI",
            "",
            reply,
            "",
            "CyberLab Security Operations",
          ].join("\n")
        );
      } catch (error: any) {
        console.error(
          "[Telegram Commands] AI request failed:",
          error
        );

        if (error?.status === 429) {
          await sendCommandResponse(
            chatId,
            [
              "🤖 CYBERLAB AI",
              "",
              "Gemini is temporarily rate-limited.",
              "Please wait about one minute and try again.",
            ].join("\n")
          );

          return;
        }

        if (
          error?.status === 503 ||
          error?.code === 503 ||
          error?.status === "UNAVAILABLE" ||
          error?.message?.includes("high demand") ||
          error?.message?.includes("currently experiencing high demand")
        ) {
          await sendCommandResponse(
            chatId,
            [
              "🤖 CYBERLAB AI",
              "",
              "CyberLab AI is temporarily unavailable because the Gemini model is experiencing high demand.",
              "Please try the AI question again shortly.",
            ].join("\n")
          );

          return;
        }

        await sendCommandResponse(
          chatId,
          [
            "🤖 CYBERLAB AI",
            "",
            "CyberLab AI was unable to generate a response right now.",
            "Please try again shortly.",
          ].join("\n")
        );
      }

      return;
    }

    case "/tshark": {
      const firstLine = lines[0].trim();
      const action = firstLine
        .slice("/tshark".length)
        .trim()
        .toLowerCase();

      if (!tsharkProvider) {
        await sendCommandResponse(
          chatId,
          [
            "📡 TSHARK",
            "",
            "TShark integration is not available right now.",
            "Please check the CyberLab server configuration.",
          ].join("\n")
        );
        return;
      }

      try {
        if (action === "start") {
          const current = await tsharkProvider.getStatus();

          if (current.running) {
            await sendCommandResponse(
              chatId,
              [
                "📡 TSHARK CAPTURE",
                "",
                "Capture is already RUNNING.",
                `Interface: ${current.interface}`,
                `Packets: ${current.packetCount}`,
                `PID: ${current.pid ?? "N/A"}`,
                "",
                "Use /tshark stop to stop the current capture.",
              ].join("\n")
            );
            return;
          }

          const status = await tsharkProvider.start();

          await sendCommandResponse(
            chatId,
            [
              "📡 TSHARK CAPTURE STARTED",
              "",
              `Status: ${status.running ? "RUNNING" : "IDLE"}`,
              `Interface: ${status.interface}`,
              `Packets: ${status.packetCount}`,
              `Capture filter: ${
                status.captureFilter || "None"
              }`,
              `PID: ${status.pid ?? "N/A"}`,
              `Started: ${status.startedAt ?? "N/A"}`,
            ].join("\n")
          );
          return;
        }

        if (action === "stop") {
          const current = await tsharkProvider.getStatus();

          if (!current.running) {
            await sendCommandResponse(
              chatId,
              [
                "📡 TSHARK CAPTURE",
                "",
                "No TShark capture is currently running.",
                `Last interface: ${current.interface}`,
                `Packets recorded: ${current.packetCount}`,
              ].join("\n")
            );
            return;
          }

          const status = await tsharkProvider.stop();

          await sendCommandResponse(
            chatId,
            [
              "📡 TSHARK CAPTURE STOPPED",
              "",
              `Status: ${status.running ? "RUNNING" : "IDLE"}`,
              `Interface: ${status.interface}`,
              `Packets recorded: ${status.packetCount}`,
              `Capture filter: ${
                status.captureFilter || "None"
              }`,
              `PID: ${status.pid ?? "N/A"}`,
            ].join("\n")
          );
          return;
        }

        if (action) {
          await sendCommandResponse(
            chatId,
            [
              "📡 TSHARK",
              "",
              `Unknown TShark action: ${action}`,
              "",
              "Available actions:",
              "/tshark",
              "/tshark start",
              "/tshark stop",
            ].join("\n")
          );
          return;
        }

        const status = await tsharkProvider.getStatus();

        await sendCommandResponse(
          chatId,
          [
            "📡 TSHARK STATUS",
            "",
            `Status: ${status.running ? "RUNNING" : "IDLE"}`,
            `Interface: ${status.interface}`,
            `Packets: ${status.packetCount}`,
            `Capture filter: ${
              status.captureFilter || "None"
            }`,
            `PID: ${status.pid ?? "N/A"}`,
            `Started: ${status.startedAt ?? "N/A"}`,
            "",
            "Commands:",
            "/tshark start",
            "/tshark stop",
          ].join("\n")
        );
      } catch (error) {
        console.error(
          "[Telegram Commands] TShark command failed:",
          error
        );

        await sendCommandResponse(
          chatId,
          [
            "❌ TSHARK COMMAND FAILED",
            "",
            error instanceof Error
              ? error.message
              : "An unexpected TShark error occurred.",
          ].join("\n")
        );
      }

      return;
    }

    case "/alert": {
      const firstLine = lines[0].trim();
      const argumentsText = firstLine
        .slice("/alert".length)
        .trim();

      const argumentsList = argumentsText
        ? argumentsText.split(/\s+/)
        : [];

      const alertId = argumentsList[0]?.trim() || "";
      const action =
        argumentsList[1]?.trim().toLowerCase() || "";

      if (!alertId) {
        await sendCommandResponse(
          chatId,
          [
            "🚨 ALERT COMMAND",
            "",
            "An Alert ID is required.",
            "",
            "Use /alerts first to see the exact Alert ID.",
            "",
            "Examples:",
            "/alert ALERT_ID",
            "/alert ALERT_ID acknowledge",
            "/alert ALERT_ID resolve",
          ].join("\n")
        );
        return;
      }

      const alert = getCyberLabAlertById(alertId);

      if (!alert) {
        await sendCommandResponse(
          chatId,
          [
            "❌ ALERT NOT FOUND",
            "",
            `Alert ID: ${alertId}`,
            "",
            "Use /alerts to see the currently available Alert IDs.",
          ].join("\n")
        );
        return;
      }

      if (!action) {
        await sendCommandResponse(
          chatId,
          [
            "🚨 CYBERLAB ALERT",
            "",
            `Alert ID: ${alert.id}`,
            `Status: ${alert.status.toUpperCase()}`,
            `Severity: ${alert.severity.toUpperCase()}`,
            `Priority: ${alert.priority}`,
            `Title: ${alert.title}`,
            `Message: ${alert.message}`,
            `Source: ${alert.source}`,
            `Type: ${alert.type}`,
            alert.target
              ? `Target: ${alert.target}`
              : "",
            alert.acknowledgedAt
              ? `Acknowledged: ${alert.acknowledgedAt}`
              : "Acknowledged: No",
            alert.resolvedAt
              ? `Resolved: ${alert.resolvedAt}`
              : "Resolved: No",
            "",
            "Actions:",
            `/alert ${alert.id} acknowledge`,
            `/alert ${alert.id} resolve`,
          ]
            .filter(Boolean)
            .join("\n")
        );
        return;
      }

      if (
        action !== "acknowledge" &&
        action !== "resolve"
      ) {
        await sendCommandResponse(
          chatId,
          [
            "❌ INVALID ALERT ACTION",
            "",
            `Alert ID: ${alert.id}`,
            "",
            "Available actions:",
            `/alert ${alert.id} acknowledge`,
            `/alert ${alert.id} resolve`,
          ].join("\n")
        );
        return;
      }

      const updatedAlert =
        updateCyberLabAlertStatus(
          alert.id,
          action === "acknowledge"
            ? "acknowledged"
            : "resolved"
        );

      if (!updatedAlert) {
        await sendCommandResponse(
          chatId,
          [
            "❌ ALERT UPDATE FAILED",
            "",
            `Alert ID: ${alert.id}`,
            "The alert could not be updated.",
          ].join("\n")
        );
        return;
      }

      await sendCommandResponse(
        chatId,
        [
          action === "acknowledge"
            ? "✅ ALERT ACKNOWLEDGED"
            : "✅ ALERT RESOLVED",
          "",
          `Alert ID: ${updatedAlert.id}`,
          `Title: ${updatedAlert.title}`,
          `Status: ${updatedAlert.status.toUpperCase()}`,
          "",
          "The updated alert status has been persisted.",
        ].join("\n")
      );

      return;
    }

    case "/status":
      await sendCommandResponse(
        chatId,
        [
          "🛡️ CYBERLAB STATUS",
          "",
          "System: Online",
          "Telegram: Connected",
          "Command authentication: Active",
          "",
          "CyberLab Security Operations",
        ].join("\n")
      );
      return;

    case "/health": {
      const alertStats =
        getCyberLabAlertStats();

      const trackedScans = scanHistoryProvider
        ? scanHistoryProvider().length
        : 0;

      let greenboneTasks: TelegramGreenboneTask[] = [];

      if (greenboneTaskProvider) {
        try {
          greenboneTasks =
            await greenboneTaskProvider();
        } catch (error) {
          console.error(
            "[Telegram Commands] Greenbone health check failed:",
            error
          );
        }
      }

      const runningGreenbone =
        greenboneTasks.filter((task) =>
          ["Running", "Requested", "Queued", "New"]
            .includes(task.status)
        ).length;

      const completedGreenbone =
        greenboneTasks.filter(
          (task) =>
            task.status.toLowerCase() === "done"
        ).length;

      const lines = [
        "🩺 CYBERLAB SYSTEM HEALTH",
        "",
        "🟢 CyberLab: Online",
        "🟢 Telegram: Connected",
        "🟢 Command authentication: Active",
        "",
        "🚨 ALERT ENGINE",
        `Total alerts: ${alertStats.total}`,
        `Pending: ${alertStats.pending}`,
        `Acknowledged: ${alertStats.acknowledged}`,
        `Resolved: ${alertStats.resolved}`,
        "",
        "🛰️ NETWORK SCANNER",
        `Tracked scans: ${trackedScans}`,
        "",
        "🟢 GREENBONE / OPENVAS",
        `Tasks returned: ${greenboneTasks.length}`,
        `Completed: ${completedGreenbone}`,
        `Running/queued: ${runningGreenbone}`,
        "",
        "CyberLab Security Operations",
      ];

      await sendCommandResponse(
        chatId,
        lines.join("\n")
      );

      return;
    }

    case "/greenbone-scan": {
      if (!greenboneScanProvider) {
        await sendCommandResponse(
          chatId,
          [
            "🔴 GREENBONE SCAN",
            "",
            "Greenbone scan control is not available.",
            "Please check the CyberLab server configuration.",
          ].join("\n")
        );

        return;
      }

      const firstLine = lines[0].trim();

      const target =
        firstLine
          .slice("/greenbone-scan".length)
          .trim();

      if (!target) {
        await sendCommandResponse(
          chatId,
          [
            "🟡 GREENBONE SCAN",
            "",
            "Please provide a scan target.",
            "",
            "Example:",
            "/greenbone-scan 127.0.0.1",
            "YOUR_PASSWORD",
          ].join("\n")
        );

        return;
      }

      if (target.length > 500) {
        await sendCommandResponse(
          chatId,
          "🟡 Greenbone target is too long. Please provide a valid IP address, hostname, or network range."
        );

        return;
      }

      try {
        const result =
          await greenboneScanProvider({
            target,
          });

        await sendCommandResponse(
          chatId,
          [
            "🟢 GREENBONE SCAN STARTED",
            "",
            `TARGET: ${result.scan.target}`,
            `TASK ID: ${result.scan.taskId}`,
            `TARGET ID: ${result.scan.targetId}`,
            `REPORT ID: ${
              result.scan.reportId || "Pending"
            }`,
            `CONFIGURATION ID: ${result.scan.configId}`,
            `SCANNER ID: ${result.scan.scannerId}`,
            "",
            "Greenbone has accepted the scan task.",
            "Use /greenbone to monitor task status.",
            "",
            "CyberLab Security Operations",
          ].join("\n")
        );
      } catch (error: any) {
        console.error(
          "[Telegram Commands] Greenbone scan failed:",
          error
        );

        await sendCommandResponse(
          chatId,
          [
            "🔴 GREENBONE SCAN FAILED",
            "",
            error?.message ||
              "CyberLab could not start the Greenbone scan.",
            "",
            "Please check the Greenbone/OpenVAS services and try again.",
          ].join("\n")
        );
      }

      return;
    }

    case "/greenbone": {
      let greenboneTasks: TelegramGreenboneTask[] = [];

      if (greenboneTaskProvider) {
        try {
          greenboneTasks =
            await greenboneTaskProvider();
        } catch (error) {
          console.error(
            "[Telegram Commands] Greenbone status check failed:",
            error
          );

          await sendCommandResponse(
            chatId,
            [
              "🔴 GREENBONE / OPENVAS",
              "",
              "Unable to retrieve Greenbone task status.",
              "Please check the Greenbone services and GMP connection.",
            ].join("\n")
          );

          return;
        }
      }

      const running = greenboneTasks.filter(
        (task) =>
          ["Running", "Requested", "Queued", "New"]
            .includes(task.status)
      );

      const completed = greenboneTasks.filter(
        (task) =>
          task.status.toLowerCase() === "done"
      );

      const interrupted = greenboneTasks.filter(
        (task) =>
          task.status.toLowerCase() === "interrupted"
      );

      const lines = [
        "🟢 GREENBONE / OPENVAS",
        "",
        `Total tasks: ${greenboneTasks.length}`,
        `Completed: ${completed.length}`,
        `Running/queued: ${running.length}`,
        `Interrupted: ${interrupted.length}`,
        "",
        "Recent Tasks:",
      ];

      for (const task of greenboneTasks.slice(0, 10)) {
        const status = task.status.toLowerCase();

        const statusEmoji =
          status === "done"
            ? "🟢"
            : status === "interrupted"
            ? "🔴"
            : ["running", "requested", "queued", "new"]
                .includes(status)
            ? "🟡"
            : "⚪";

        const reportText = task.reportId
          ? "Report available"
          : "No report";

        lines.push(
          "",
          `${statusEmoji} ${task.name}`,
          `Status: ${task.status}`,
          `Progress: ${task.progress}%`,
          reportText
        );
      }

      lines.push(
        "",
        "CyberLab Security Operations"
      );

      await sendCommandResponse(
        chatId,
        lines.join("\n")
      );

      return;
    }

    case "/scans": {
      const scans = scanHistoryProvider
        ? scanHistoryProvider().slice(0, 10)
        : [];

      const lines = [
        "🛰️ CYBERLAB SCAN HISTORY",
        "",
        `Tracked scans: ${scans.length}`,
        "",
      ];

      if (scans.length === 0) {
        lines.push("No scan history currently recorded.");
      } else {
        lines.push("Recent Scans:");

        for (const scan of scans) {
          const statusEmoji =
            scan.status === "success"
              ? "🟢"
              : scan.status === "running"
              ? "🟡"
              : "🔴";

          const durationSeconds =
            scan.durationMs > 0
              ? (scan.durationMs / 1000).toFixed(1)
              : "0.0";

          const vulnerabilities =
            scan.vulnerabilitiesCount;

          lines.push(
            "",
            `${statusEmoji} ${scan.status.toUpperCase()}`,
            `Target: ${scan.target}`,
            `Type: ${scan.type}`,
            `Hosts: ${scan.hostsFound}`,
            `Open ports: ${scan.openPortsTotal}`,
            `Vulnerabilities: ` +
              `C${vulnerabilities.critical} ` +
              `H${vulnerabilities.high} ` +
              `M${vulnerabilities.medium} ` +
              `L${vulnerabilities.low} ` +
              `I${vulnerabilities.info}`,
            `Duration: ${durationSeconds}s`,
            `Time: ${new Date(scan.timestamp).toLocaleString()}`,
          );
        }
      }

      lines.push(
        "",
        "🟢 GREENBONE / OPENVAS"
      );

      try {
        const greenboneTasks =
          greenboneTaskProvider
            ? await greenboneTaskProvider()
            : [];

        if (greenboneTasks.length === 0) {
          lines.push(
            "",
            "No Greenbone tasks currently recorded."
          );
        } else {
          for (const task of greenboneTasks.slice(0, 10)) {
            const statusLower =
              task.status.toLowerCase();

            const statusEmoji =
              statusLower === "done"
                ? "🟢"
                : [
                    "running",
                    "requested",
                    "queued",
                  ].includes(statusLower)
                ? "🟡"
                : statusLower === "interrupted"
                ? "🔴"
                : "⚪";

            lines.push(
              "",
              `${statusEmoji} ${task.status.toUpperCase()}`,
              `Task: ${task.name}`,
              `Progress: ${task.progress}%`,
              `Task ID: ${task.id}`,
              task.reportId
                ? "Report: Available"
                : "Report: Not available"
            );
          }
        }
      } catch (error) {
        console.error(
          "[Telegram Commands] Greenbone history failed:",
          error
        );

        lines.push(
          "",
          "⚠️ Greenbone history unavailable."
        );
      }

      await sendCommandResponse(
        chatId,
        lines.join("\n")
      );

      return;
    }

    case "/report": {
      const firstLine = lines[0].trim();
      const reportId = firstLine
        .slice("/report".length)
        .trim();

      if (!reportId) {
        await sendCommandResponse(
          chatId,
          [
            "📄 CYBERLAB PDF REPORT",
            "",
            "Usage:",
            "/report <report-id>",
            "",
            "Example:",
            "/report report-1789801200538",
            "",
            "Use /scans to see available scan/report IDs.",
          ].join("\n")
        );

        return;
      }

      const report = getCyberLabReport(reportId);

      if (!report) {
        await sendCommandResponse(
          chatId,
          [
            "❌ REPORT NOT FOUND",
            "",
            `Report ID: ${reportId}`,
            "",
            "The requested CyberLab report could not be found.",
            "",
            "Use /scans to review available scan activity.",
          ].join("\n")
        );

        return;
      }

      try {
        await sendCommandResponse(
          chatId,
          [
            "📄 CYBERLAB PDF REPORT",
            "",
            `Report: ${report.id}`,
            `Target: ${report.target}`,
            `Risk: ${report.overallRiskLevel} (${report.riskScore}/100)`,
            `Findings: ${report.findingCount}`,
            `Hosts: ${report.hostCount}`,
            `Open Ports: ${report.openPortCount}`,
            "",
            "Generating and attaching the downloadable PDF report now...",
          ].join("\n")
        );

        const pdfBuffer =
          await exportCyberLabReportPdf(
            report
          );

        const filename =
          `${report.id}.pdf`;

        const caption = [
          "📄 CyberLab PDF Security Report",
          "",
          `Report: ${report.id}`,
          `Target: ${report.target}`,
          `Risk: ${report.overallRiskLevel} (${report.riskScore}/100)`,
          `Findings: ${report.findingCount}`,
          `Hosts: ${report.hostCount}`,
          `Open Ports: ${report.openPortCount}`,
          "",
          "Download or open the attached PDF to view the complete report.",
        ].join("\n");

        const sent =
          await sendTelegramDocument(
            pdfBuffer,
            filename,
            caption,
            chatId
          );

        if (!sent) {
          await sendCommandResponse(
            chatId,
            [
              "⚠️ PDF GENERATION COMPLETED",
              "",
              `Report: ${report.id}`,
              "",
              "The PDF was generated, but Telegram rejected the document upload.",
              "Check the CyberLab server log for the Telegram API error.",
            ].join("\n")
          );
        }
      } catch (error) {
        console.error(
          "[Telegram Commands] PDF report generation failed:",
          error
        );

        await sendCommandResponse(
          chatId,
          [
            "❌ PDF REPORT FAILED",
            "",
            `Report: ${report.id}`,
            "",
            error instanceof Error
              ? error.message
              : "Unknown PDF generation error.",
          ].join("\n")
        );
      }

      return;
    }

    case "/alerts": {
      const alerts = getCyberLabAlerts(10);
      const stats = getCyberLabAlertStats();

      const lines = [
        "🚨 CYBERLAB ALERTS",
        "",
        `Total: ${stats.total}`,
        `Pending: ${stats.pending}`,
        `Acknowledged: ${stats.acknowledged}`,
        `Resolved: ${stats.resolved}`,
        `Critical: ${stats.critical}`,
        `High: ${stats.high}`,
        `Medium: ${stats.medium}`,
        "",
      ];

      if (alerts.length === 0) {
        lines.push("No alerts currently recorded.");
      } else {
        lines.push("Recent Alerts:");

        for (const alert of alerts) {
          const emoji =
            alert.severity === "critical"
              ? "🔴"
              : alert.severity === "high"
              ? "🟠"
              : alert.severity === "medium"
              ? "🟡"
              : "🔵";

          lines.push(
            "",
            `${emoji} ${alert.severity.toUpperCase()}`,
            `Alert ID: ${alert.id}`,
            `${alert.title}`,
            `Status: ${alert.status.toUpperCase()}`,
            alert.target
              ? `Target: ${alert.target}`
              : `Source: ${alert.source}`
          );
        }
      }

      await sendCommandResponse(
        chatId,
        lines.join("\n")
      );

      return;
    }

    default:
      await sendCommandResponse(
        chatId,
        [
          "🛡️ CYBERLAB SECURITY BOT",
          "",
          `Unknown command: ${command}`,
          "",
          "Available commands:",
          "/status",
          "/health",
          "/alerts",
          "/alert <id> [acknowledge|resolve]",
          "/tshark [start|stop]",
          "/scans",
          "/greenbone",
          "/greenbone-scan <target>",
          "/ai <question>",
        ].join("\n")
      );
      return;
  }
}

let polling = false;
let offset = 0;

export function isTelegramCommandListenerRunning(): boolean {
  return polling;
}

export async function startTelegramCommandListener(): Promise<void> {
  if (polling) {
    return;
  }

  const config = getTelegramConfig();

  if (!config) {
    console.warn(
      "[Telegram Commands] Listener not started because configuration is missing."
    );
    return;
  }

  polling = true;

  console.log(
    "[Telegram Commands] Starting Telegram command listener..."
  );

  while (polling) {
    try {
      const response = await fetch(
        `${TELEGRAM_API_BASE}/bot${config.token}/getUpdates?timeout=30&offset=${offset}`,
        {
          method: "GET",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        console.error(
          "[Telegram Commands] getUpdates failed:",
          result
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 5000)
        );

        continue;
      }

      const updates =
        (result.result || []) as TelegramUpdate[];

      for (const update of updates) {
        offset = update.update_id + 1;

        await handleTelegramCommand(update);
      }
    } catch (error) {
      console.error(
        "[Telegram Commands] Polling error:",
        error
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 5000)
      );
    }
  }
}
