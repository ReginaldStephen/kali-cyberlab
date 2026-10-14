import fs from "fs";
import os from "os";
import path from "path";
import { execFile, spawn } from "child_process";

export interface BurpListener {
  address: string;
  port: number;
  protocol: "tcp" | "unknown";
  source: string;
}

export interface BurpCapability {
  id: string;
  name: string;
  category: string;
  available: boolean;
  edition: "community" | "professional" | "unknown";
  status:
    | "available"
    | "limited"
    | "professional"
    | "not-detected";
  description: string;
}

export interface BurpStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  edition: "community" | "professional" | "unknown";
  pid: number | null;
  jarPath: string | null;
  launcherPath: string | null;
  listeners: BurpListener[];
  proxyListener: BurpListener | null;
  restConfigured: boolean;
  integrationState:
    | "not-installed"
    | "stopped"
    | "running"
    | "listener-ready"
    | "rest-configured";
  launchCommand: string | null;
  message: string;
}

const BURP_LAUNCHER = "/usr/bin/burpsuite";
const BURP_JAR = "/usr/share/burpsuite/burpsuite.jar";

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function runCommand(
  command: string,
  args: string[] = [],
  timeoutMs = 5000
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr?.trim() ||
                stdout?.trim() ||
                error.message ||
                `Command failed: ${command}`
            )
          );
          return;
        }

        resolve(stdout);
      }
    );
  });
}

export function getBurpInstallation(): {
  installed: boolean;
  launcherPath: string | null;
  jarPath: string | null;
} {
  const launcherPath = fileExists(BURP_LAUNCHER)
    ? BURP_LAUNCHER
    : null;

  const jarPath = fileExists(BURP_JAR)
    ? BURP_JAR
    : null;

  return {
    installed: Boolean(launcherPath || jarPath),
    launcherPath,
    jarPath,
  };
}

export async function getBurpVersion(): Promise<{
  version: string | null;
  edition: "community" | "professional" | "unknown";
}> {
  const installation = getBurpInstallation();

  if (!installation.launcherPath) {
    return {
      version: null,
      edition: "unknown",
    };
  }

  try {
    const output = await runCommand(
      installation.launcherPath,
      ["--version"],
      10000
    );

    const text = output.trim();

    const versionMatch = text.match(
      /\b(\d{4}\.\d+\.\d+-\d+)\b/
    );

    const version = versionMatch?.[1] || null;

    const normalized = text.toLowerCase();

    let edition: "community" | "professional" | "unknown" =
      "unknown";

    if (normalized.includes("community")) {
      edition = "community";
    } else if (normalized.includes("professional")) {
      edition = "professional";
    }

    return {
      version,
      edition,
    };
  } catch {
    return {
      version: null,
      edition: "unknown",
    };
  }
}

async function getBurpJavaProcesses(): Promise<
  Array<{
    pid: number;
    command: string;
  }>
> {
  try {
    const output = await runCommand(
      "ps",
      ["-eo", "pid=,args="],
      5000
    );

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.*)$/);

        if (!match) {
          return null;
        }

        return {
          pid: Number(match[1]),
          command: match[2],
        };
      })
      .filter(
        (
          item
        ): item is {
          pid: number;
          command: string;
        } => {
          if (!item) {
            return false;
          }

          const command = item.command.toLowerCase();

          return (
            command.includes("burpsuite.jar") ||
            command.includes("burp suite")
          );
        }
      );
  } catch {
    return [];
  }
}

async function getListeningSockets(): Promise<BurpListener[]> {
  try {
    const output = await runCommand(
      "ss",
      ["-lntp"],
      5000
    );

    const listeners: BurpListener[] = [];

    for (const line of output.split("\n")) {
      if (!line.includes("LISTEN")) {
        continue;
      }

      const match = line.match(
        /LISTEN\s+\d+\s+\d+\s+([^\s]+):(\d+)/
      );

      if (!match) {
        continue;
      }

      const address = match[1];
      const port = Number(match[2]);

      if (!Number.isFinite(port)) {
        continue;
      }

      const lower = line.toLowerCase();

      if (
        !lower.includes("burp") &&
        !lower.includes("java")
      ) {
        continue;
      }

      listeners.push({
        address,
        port,
        protocol: "tcp",
        source: line.trim(),
      });
    }

    return listeners;
  } catch {
    return [];
  }
}

export async function getBurpStatus(): Promise<BurpStatus> {
  const installation = getBurpInstallation();

  if (!installation.installed) {
    return {
      installed: false,
      running: false,
      version: null,
      edition: "unknown",
      pid: null,
      jarPath: null,
      launcherPath: null,
      listeners: [],
      proxyListener: null,
      restConfigured: false,
      integrationState: "not-installed",
      launchCommand: null,
      message: "Burp Suite is not installed.",
    };
  }

  const versionInfo = await getBurpVersion();
  const processes = await getBurpJavaProcesses();
  const listeners = await getListeningSockets();

  const process = processes[0] || null;

  const proxyListener =
    listeners.find((listener) =>
      [8080, 8081, 8888, 8000].includes(listener.port)
    ) || listeners[0] || null;

  const running = Boolean(process);

  const restUrl =
    String(globalThis.process?.env?.BURP_REST_URL || "").trim();

  const apiKey =
    String(globalThis.process?.env?.BURP_REST_API_KEY || "").trim();

  const restConfigured = Boolean(restUrl && apiKey);

  const integrationState:
    | "not-installed"
    | "stopped"
    | "running"
    | "listener-ready"
    | "rest-configured" =
    !running
      ? "stopped"
      : restConfigured
        ? "rest-configured"
        : proxyListener
          ? "listener-ready"
          : "running";

  const message =
    !running
      ? "Burp Suite is installed but not running."
      : restConfigured
        ? "Burp Suite is running and REST integration is configured."
        : proxyListener
          ? "Burp Suite is running with a proxy listener detected."
          : "Burp Suite process is running; no proxy listener detected.";

  return {
    installed: true,
    running,
    version: versionInfo.version,
    edition: versionInfo.edition,
    pid: process?.pid || null,
    jarPath: installation.jarPath,
    launcherPath: installation.launcherPath,
    listeners,
    proxyListener,
    restConfigured,
    integrationState,
    launchCommand: installation.launcherPath
      ? installation.launcherPath
      : installation.jarPath
        ? `java -jar ${installation.jarPath}`
        : null,
    message,
  };
}

export function getBurpCapabilities(
  edition: "community" | "professional" | "unknown"
): BurpCapability[] {
  const capabilities: Array<
    Omit<BurpCapability, "available" | "status" | "edition">
  > = [
    {
      id: "dashboard",
      name: "Dashboard",
      category: "Core",
      description:
        "Burp Suite dashboard and task overview.",
    },
    {
      id: "target",
      name: "Target / Site Map",
      category: "Target",
      description:
        "Define testing scope and inspect the discovered application site map.",
    },
    {
      id: "burp-browser",
      name: "Burp Browser",
      category: "Browser",
      description:
        "Burp's built-in browser for manual web application testing.",
    },
    {
      id: "proxy",
      name: "Proxy / Intercept",
      category: "Proxy",
      description:
        "Intercept, inspect and modify HTTP/S traffic.",
    },
    {
      id: "http-history",
      name: "HTTP History",
      category: "Proxy",
      description:
        "Review HTTP requests and responses captured by Burp Proxy.",
    },
    {
      id: "websockets",
      name: "WebSockets",
      category: "Proxy",
      description:
        "Inspect and test WebSocket messages and traffic.",
    },
    {
      id: "repeater",
      name: "Repeater",
      category: "Testing",
      description:
        "Manually modify and resend individual HTTP requests.",
    },
    {
      id: "intruder",
      name: "Intruder",
      category: "Testing",
      description:
        "Automated request mutation and attack workflows; Community Edition has limited functionality.",
    },
    {
      id: "scanner",
      name: "Scanner",
      category: "Scanning",
      description:
        "Automated vulnerability scanning available in Burp Suite Professional.",
    },
    {
      id: "sequencer",
      name: "Sequencer",
      category: "Analysis",
      description:
        "Analyze the quality and randomness of security-sensitive tokens.",
    },
    {
      id: "decoder",
      name: "Decoder",
      category: "Utilities",
      description:
        "Encode, decode and transform data used during testing.",
    },
    {
      id: "comparer",
      name: "Comparer",
      category: "Utilities",
      description:
        "Compare HTTP messages and other testing artifacts.",
    },
    {
      id: "logger",
      name: "Logger",
      category: "Logging",
      description:
        "Record and analyze HTTP traffic generated by Burp.",
    },
    {
      id: "organizer",
      name: "Organizer",
      category: "Workflow",
      description:
        "Store, annotate and organize HTTP messages for investigation.",
    },
    {
      id: "collaborator",
      name: "Collaborator / OAST",
      category: "OAST",
      description:
        "Detect out-of-band interactions using Burp Collaborator.",
    },
    {
      id: "extender",
      name: "Extensions / Extender",
      category: "Extensions",
      description:
        "Extend Burp with custom and community extensions.",
    },
    {
      id: "project-configuration",
      name: "Project Configuration",
      category: "Configuration",
      description:
        "Configure Burp project-level testing behavior.",
    },
    {
      id: "scope",
      name: "Scope Management",
      category: "Target",
      description:
        "Define and manage hosts and URLs included in testing scope.",
    },
    {
      id: "inspector",
      name: "Inspector",
      category: "Message Analysis",
      description:
        "Inspect and edit decoded HTTP and WebSocket message components.",
    },
    {
      id: "message-editor",
      name: "Message Editor",
      category: "Message Analysis",
      description:
        "View and edit HTTP and WebSocket messages throughout Burp.",
    },
    {
      id: "dom-invader",
      name: "DOM Invader",
      category: "Browser Testing",
      description:
        "Browser-based testing for DOM XSS and related client-side issues.",
    },
    {
      id: "clickbandit",
      name: "Clickbandit",
      category: "Browser Testing",
      description:
        "Generate clickjacking proof-of-concept attacks through browser interaction.",
    },
    {
      id: "command-palette",
      name: "Command Palette",
      category: "Workflow",
      description:
        "Find and execute Burp commands from the keyboard.",
    },
    {
      id: "context-menu",
      name: "Context Menu",
      category: "Workflow",
      description:
        "Contextual actions available throughout Burp testing tools.",
    },
    {
      id: "filter-settings",
      name: "Filter Settings",
      category: "Workflow",
      description:
        "Filter messages displayed by Burp testing tools.",
    },
    {
      id: "search",
      name: "Search",
      category: "Analysis",
      description:
        "Search across Burp testing data and project content.",
    },
    {
      id: "scan-configuration",
      name: "Scan Configuration",
      category: "Scanning",
      description:
        "Configure automated scanning behavior in Burp Suite Professional.",
    },
    {
      id: "finding-management",
      name: "Finding / Issue Management",
      category: "Findings",
      description:
        "Track and manage security issues identified during testing.",
    },
    {
      id: "export-reporting",
      name: "Export / Reporting",
      category: "Reporting",
      description:
        "Export security testing results and reports.",
    },
    {
      id: "ai-features",
      name: "Burp AI",
      category: "AI",
      description:
        "AI-assisted Burp workflows subject to the applicable Burp license and feature availability.",
    },
    {
      id: "burp-at",
      name: "Burp AI Testing",
      category: "AI",
      description:
        "Advanced AI-assisted testing capabilities provided by Burp AT.",
    },
  ];

  // Community Edition has limited Intruder functionality.
  const limitedCommunity = new Set([
    "intruder",
  ]);

  // These capabilities require Burp Suite Professional.
  const professionalOnly = new Set([
    "scanner",
    "collaborator",
    "scan-configuration",
    "ai-features",
    "burp-at",
  ]);

  return capabilities.map((capability) => {
    const isLimitedCommunity =
      limitedCommunity.has(capability.id);

    const requiresProfessional =
      professionalOnly.has(capability.id);

    const available =
      edition === "professional"
        ? true
        : edition === "community"
          ? !requiresProfessional
          : false;

    return {
      ...capability,
      available,
      edition:
        requiresProfessional
          ? "professional"
          : "community",
      status:
        available
          ? isLimitedCommunity && edition === "community"
            ? "limited"
            : "available"
          : requiresProfessional
            ? "professional"
            : "not-detected",
    };
  });
}

export async function launchBurp(): Promise<{
  started: boolean;
  pid: number | null;
  message: string;
}> {
  const status = await getBurpStatus();

  if (!status.installed) {
    return {
      started: false,
      pid: null,
      message: "Burp Suite is not installed.",
    };
  }

  if (status.running) {
    return {
      started: false,
      pid: status.pid,
      message: "Burp Suite is already running.",
    };
  }

  const launcher = status.launcherPath || BURP_LAUNCHER;

  if (!fileExists(launcher)) {
    return {
      started: false,
      pid: null,
      message: `Burp launcher not found: ${launcher}`,
    };
  }

  try {
    const child = spawn(
      launcher,
      [],
      {
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
        },
      }
    );

    child.unref();

    return {
      started: true,
      pid: child.pid || null,
      message:
        "Burp Suite launch requested successfully.",
    };
  } catch (error: any) {
    return {
      started: false,
      pid: null,
      message:
        error?.message ||
        "Unable to launch Burp Suite.",
    };
  }
}

export async function getBurpIntegrationContext() {
  const status = await getBurpStatus();

  return {
    ...status,
    capabilities: getBurpCapabilities(status.edition),
    hostname: os.hostname(),
    platform: process.platform,
    architecture: process.arch,
  };
}
// ============================================================
// CYBERLAB BURP BACKEND DATA PLANE
// ============================================================

// ============================================================
// CYBERLAB BURP BACKEND DATA PLANE
// ============================================================

export interface BurpTarget {
  id: string;
  name: string;
  baseUrl: string;
  host: string;
  port: number;
  protocol: "http" | "https";
  inScope: boolean;
  enabled: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BurpScopeEntry {
  id: string;
  pattern: string;
  include: boolean;
  notes: string;
  createdAt: string;
}

export type BurpRequestState =
  | "pending"
  | "held"
  | "forwarded"
  | "dropped";

export interface BurpHttpRecord {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number | null;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
  requestBytes: number;
  responseBytes: number;
  durationMs: number;
  mimeType: string | null;
  source: "cyberlab" | "burp-rest" | "burp-proxy";
  targetId: string | null;

  /**
   * Lifecycle state for CyberLab-native traffic.
   * Existing records are normalized to "forwarded".
   */
  requestState: BurpRequestState;

  /**
   * Raw HTTP representations are persisted so the UI can
   * display the exact request/response without reconstructing
   * them differently on every render.
   */
  rawRequest: string;
  rawResponse: string;

  /**
   * True when this request entered the CyberLab interception
   * queue before being forwarded.
   */
  intercepted: boolean;

  /**
   * Timestamp of the most recent state transition.
   */
  stateUpdatedAt: string;
}

export interface BurpSiteMapEntry {
  id: string;
  url: string;
  method: string;
  host: string;
  path: string;
  status: number | null;
  contentType: string | null;
  responseBytes: number;
  firstSeen: string;
  lastSeen: string;
  source: "cyberlab" | "burp-rest" | "burp-proxy";
}

export interface BurpFinding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "certain" | "firm" | "tentative";
  host: string;
  port: number | null;
  url: string | null;
  evidence: string;
  description: string;
  remediation: string;
  source: "burp" | "cyberlab";
  createdAt: string;
  updatedAt: string;
}

interface BurpBackendState {
  targets: BurpTarget[];
  scope: BurpScopeEntry[];
  history: BurpHttpRecord[];
  siteMap: BurpSiteMapEntry[];
  findings: BurpFinding[];

  /**
   * CyberLab-native interception switch.
   *
   * This intentionally applies to requests entering through
   * CyberLab's request execution path. It does not claim to
   * control arbitrary Burp GUI/browser traffic.
   */
  interceptEnabled: boolean;
}

const BURP_BACKEND_DIR = path.join(process.cwd(), "data", "burp");
const BURP_BACKEND_FILE = path.join(BURP_BACKEND_DIR, "backend.json");
const BURP_HISTORY_LIMIT = 500;
const BURP_SITE_MAP_LIMIT = 1000;
const BURP_FINDING_LIMIT = 500;

function createBurpId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function emptyBurpBackendState(): BurpBackendState {
  return {
    targets: [],
    scope: [],
    history: [],
    siteMap: [],
    findings: [],
    interceptEnabled: false,
  };
}

function normalizeBurpHttpRecord(
  record: Partial<BurpHttpRecord>
): BurpHttpRecord {
  const requestHeaders =
    record.requestHeaders &&
    typeof record.requestHeaders === "object"
      ? record.requestHeaders
      : {};

  const responseHeaders =
    record.responseHeaders &&
    typeof record.responseHeaders === "object"
      ? record.responseHeaders
      : {};

  const requestBody =
    typeof record.requestBody === "string"
      ? record.requestBody
      : "";

  const responseBody =
    typeof record.responseBody === "string"
      ? record.responseBody
      : "";

  const method =
    String(record.method || "GET")
      .trim()
      .toUpperCase();

  const url = String(record.url || "");

  const rawRequest =
    typeof record.rawRequest === "string" &&
    record.rawRequest.length > 0
      ? record.rawRequest
      : buildRawHttpRequest(
          method,
          url,
          requestHeaders,
          requestBody
        );

  const rawResponse =
    typeof record.rawResponse === "string"
      ? record.rawResponse
      : buildRawHttpResponse(
          record.status ?? null,
          responseHeaders,
          responseBody
        );

  const state: BurpRequestState =
    record.requestState === "pending" ||
    record.requestState === "held" ||
    record.requestState === "forwarded" ||
    record.requestState === "dropped"
      ? record.requestState
      : "forwarded";

  const timestamp =
    typeof record.timestamp === "string"
      ? record.timestamp
      : new Date().toISOString();

  return {
    id:
      typeof record.id === "string" && record.id
        ? record.id
        : createBurpId("http"),
    timestamp,
    method,
    url,
    status:
      typeof record.status === "number"
        ? record.status
        : null,
    requestHeaders,
    requestBody,
    responseHeaders,
    responseBody,
    requestBytes:
      typeof record.requestBytes === "number"
        ? record.requestBytes
        : Buffer.byteLength(requestBody, "utf8"),
    responseBytes:
      typeof record.responseBytes === "number"
        ? record.responseBytes
        : Buffer.byteLength(responseBody, "utf8"),
    durationMs:
      typeof record.durationMs === "number"
        ? record.durationMs
        : 0,
    mimeType:
      typeof record.mimeType === "string"
        ? record.mimeType
        : null,
    source:
      record.source === "burp-rest"
        ? "burp-rest"
        : record.source === "burp-proxy"
          ? "burp-proxy"
          : "cyberlab",
    targetId:
      typeof record.targetId === "string"
        ? record.targetId
        : null,
    requestState: state,
    rawRequest,
    rawResponse,
    intercepted: Boolean(record.intercepted),
    stateUpdatedAt:
      typeof record.stateUpdatedAt === "string"
        ? record.stateUpdatedAt
        : timestamp,
  };
}

function buildRawHttpRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string
): string {
  let parsedUrl: URL | null = null;

  try {
    parsedUrl = new URL(url);
  } catch {
    parsedUrl = null;
  }

  const path =
    parsedUrl
      ? `${parsedUrl.pathname}${parsedUrl.search}` || "/"
      : url || "/";

  const host =
    parsedUrl?.host ||
    headers.Host ||
    headers.host ||
    "";

  const headerEntries = Object.entries(headers)
    .filter(([key]) => key.toLowerCase() !== "host")
    .map(([key, value]) => `${key}: ${value}`);

  if (host) {
    headerEntries.unshift(`Host: ${host}`);
  }

  return [
    `${method} ${path} HTTP/1.1`,
    ...headerEntries,
    "",
    body || "",
  ].join("\r\n");
}

function buildRawHttpResponse(
  status: number | null,
  headers: Record<string, string>,
  body: string
): string {
  const statusLine =
    typeof status === "number"
      ? `HTTP/1.1 ${status}`
      : "HTTP/1.1";

  const headerEntries = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`);

  return [
    statusLine,
    ...headerEntries,
    "",
    body || "",
  ].join("\r\n");
}

function bytesToHex(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

function loadBurpBackendState(): BurpBackendState {
  try {
    if (!fileExists(BURP_BACKEND_FILE)) {
      return emptyBurpBackendState();
    }

    const parsed = JSON.parse(
      fs.readFileSync(BURP_BACKEND_FILE, "utf8")
    );

    return {
      targets: Array.isArray(parsed?.targets) ? parsed.targets : [],
      scope: Array.isArray(parsed?.scope) ? parsed.scope : [],
      history: Array.isArray(parsed?.history)
        ? parsed.history.map(normalizeBurpHttpRecord)
        : [],
      siteMap: Array.isArray(parsed?.siteMap) ? parsed.siteMap : [],
      findings: Array.isArray(parsed?.findings)
        ? parsed.findings
        : [],
      interceptEnabled:
        parsed?.interceptEnabled === true,
    };
  } catch {
    return emptyBurpBackendState();
  }
}

function saveBurpBackendState(state: BurpBackendState): void {
  fs.mkdirSync(BURP_BACKEND_DIR, { recursive: true });

  const tempFile = `${BURP_BACKEND_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(state, null, 2),
    "utf8"
  );

  fs.renameSync(tempFile, BURP_BACKEND_FILE);
}

function normalizeBaseUrl(rawUrl: string): URL {
  const value = String(rawUrl || "").trim();

  if (!value) {
    throw new Error("A target URL is required.");
  }

  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(
      "Burp targets must use http:// or https:// URLs."
    );
  }

  return url;
}

function isHostInTarget(
  target: BurpTarget,
  url: URL
): boolean {
  if (target.host.toLowerCase() !== url.hostname.toLowerCase()) {
    return false;
  }

  const targetPort =
    target.port ||
    (target.protocol === "https" ? 443 : 80);

  const requestPort =
    Number(url.port) ||
    (url.protocol === "https:" ? 443 : 80);

  return targetPort === requestPort;
}

function isPatternMatch(
  pattern: string,
  url: URL
): boolean {
  const normalized = String(pattern || "").trim();

  if (!normalized) {
    return false;
  }

  try {
    const hasExplicitProtocol =
      /^https?:\/\//i.test(normalized);

    const patternUrl = new URL(
      hasExplicitProtocol
        ? normalized
        : `http://${normalized}`
    );

    const protocolMatches =
      !hasExplicitProtocol ||
      patternUrl.protocol === url.protocol;

    const hostnamePattern =
      patternUrl.hostname.toLowerCase();

    const requestHostname =
      url.hostname.toLowerCase();

    const hostnameMatches =
      hostnamePattern === requestHostname ||
      (
        hostnamePattern.startsWith("*.") &&
        requestHostname.endsWith(
          hostnamePattern.slice(1)
        )
      );

    if (!protocolMatches || !hostnameMatches) {
      return false;
    }

    if (
      patternUrl.port &&
      patternUrl.port !== url.port
    ) {
      return false;
    }

    const pathPattern =
      patternUrl.pathname || "/";

    if (pathPattern === "/" || pathPattern === "/*") {
      return true;
    }

    if (pathPattern.endsWith("*")) {
      return url.pathname.startsWith(
        pathPattern.slice(0, -1)
      );
    }

    return url.pathname === pathPattern;
  } catch {
    return false;
  }
}

export function isBurpTargetInScope(
  rawUrl: string
): boolean {
  let url: URL;

  try {
    url = normalizeBaseUrl(rawUrl);
  } catch {
    return false;
  }

  const state = loadBurpBackendState();

  const matchingTarget = state.targets.find(
    (target) =>
      target.enabled &&
      target.inScope &&
      isHostInTarget(target, url)
  );

  if (matchingTarget) {
    const exclusions = state.scope.filter(
      (entry) => entry.include === false
    );

    return !exclusions.some((entry) =>
      isPatternMatch(entry.pattern, url)
    );
  }

  const includes = state.scope.filter(
    (entry) => entry.include
  );

  if (!includes.length) {
    return false;
  }

  if (
    includes.some((entry) =>
      isPatternMatch(entry.pattern, url)
    )
  ) {
    return !state.scope.some(
      (entry) =>
        !entry.include &&
        isPatternMatch(entry.pattern, url)
    );
  }

  return false;
}

/**
 * Shared CyberLab Burp traffic ingestion layer.
 *
 * This is intentionally separate from executeBurpHttpRequest().
 * It allows future Burp proxy/browser traffic to enter the same
 * History + Site Map data plane without creating a second record
 * model.
 *
 * Scope is ALWAYS enforced here.
 */
export function ingestBurpHttpRecord(
  input: Partial<BurpHttpRecord> & {
    url: string;
  }
): BurpHttpRecord {
  const url = normalizeBaseUrl(input.url);

  if (!isBurpTargetInScope(url.toString())) {
    throw new Error(
      "Target is not in CyberLab Burp scope. Add or enable the target before ingesting traffic."
    );
  }

  const state = loadBurpBackendState();

  const matchingTarget =
    state.targets.find(
      (target) =>
        target.enabled &&
        target.inScope &&
        isHostInTarget(target, url)
    ) || null;

  const normalized = normalizeBurpHttpRecord({
    ...input,
    url: url.toString(),
    targetId:
      typeof input.targetId === "string" &&
      input.targetId.trim()
        ? input.targetId.trim()
        : matchingTarget?.id || null,
  });

  /*
   * Replace an existing record with the same ID so forwarded
   * intercepted requests do not create duplicate History rows.
   */
  state.history = state.history.filter(
    (item) => item.id !== normalized.id
  );

  state.history.unshift(normalized);
  state.history = state.history.slice(
    0,
    BURP_HISTORY_LIMIT
  );

  /*
   * Only completed transactions belong in the Site Map.
   * A held/pending request has no response metadata yet.
   */
  if (typeof normalized.status === "number") {
    const existing = state.siteMap.find(
      (item) =>
        item.url === normalized.url &&
        item.method === normalized.method
    );

    if (existing) {
      existing.status = normalized.status;
      existing.contentType =
        normalized.mimeType;
      existing.responseBytes =
        normalized.responseBytes;
      existing.lastSeen =
        normalized.timestamp;
    } else {
      const parsedUrl = new URL(normalized.url);

      state.siteMap.unshift({
        id: createBurpId("site"),
        url: normalized.url,
        method: normalized.method,
        host: parsedUrl.hostname,
        path:
          `${parsedUrl.pathname}${parsedUrl.search}` ||
          "/",
        status: normalized.status,
        contentType: normalized.mimeType,
        responseBytes: normalized.responseBytes,
        firstSeen: normalized.timestamp,
        lastSeen: normalized.timestamp,
        source: normalized.source,
      });
    }

    state.siteMap = state.siteMap.slice(
      0,
      BURP_SITE_MAP_LIMIT
    );
  }

  saveBurpBackendState(state);

  return normalized;
}

export function listBurpTargets(): BurpTarget[] {
  return loadBurpBackendState().targets;
}

export function createBurpTarget(input: {
  name?: string;
  baseUrl: string;
  notes?: string;
}): BurpTarget {
  const url = normalizeBaseUrl(input.baseUrl);
  const now = new Date().toISOString();

  const target: BurpTarget = {
    id: createBurpId("target"),
    name:
      String(input.name || "").trim() ||
      url.hostname,
    baseUrl: url.origin,
    host: url.hostname,
    port:
      Number(url.port) ||
      (url.protocol === "https:" ? 443 : 80),
    protocol:
      url.protocol === "https:" ? "https" : "http",
    inScope: true,
    enabled: true,
    notes: String(input.notes || "").trim(),
    createdAt: now,
    updatedAt: now,
  };

  const state = loadBurpBackendState();

  const duplicate = state.targets.find(
    (existing) =>
      existing.host === target.host &&
      existing.port === target.port &&
      existing.protocol === target.protocol
  );

  if (duplicate) {
    return duplicate;
  }

  state.targets.unshift(target);
  saveBurpBackendState(state);

  return target;
}

export function updateBurpTarget(
  id: string,
  input: Partial<{
    name: string;
    baseUrl: string;
    inScope: boolean;
    enabled: boolean;
    notes: string;
  }>
): BurpTarget | null {
  const state = loadBurpBackendState();
  const target = state.targets.find(
    (item) => item.id === id
  );

  if (!target) {
    return null;
  }

  if (input.baseUrl !== undefined) {
    const url = normalizeBaseUrl(input.baseUrl);

    target.baseUrl = url.origin;
    target.host = url.hostname;
    target.port =
      Number(url.port) ||
      (url.protocol === "https:" ? 443 : 80);
    target.protocol =
      url.protocol === "https:" ? "https" : "http";
  }

  if (input.name !== undefined) {
    target.name = String(input.name).trim();
  }

  if (input.inScope !== undefined) {
    target.inScope = Boolean(input.inScope);
  }

  if (input.enabled !== undefined) {
    target.enabled = Boolean(input.enabled);
  }

  if (input.notes !== undefined) {
    target.notes = String(input.notes);
  }

  target.updatedAt = new Date().toISOString();

  saveBurpBackendState(state);

  return target;
}

export function deleteBurpTarget(
  id: string
): boolean {
  const state = loadBurpBackendState();
  const before = state.targets.length;

  state.targets = state.targets.filter(
    (target) => target.id !== id
  );

  if (state.targets.length === before) {
    return false;
  }

  saveBurpBackendState(state);
  return true;
}

export function listBurpScope(): BurpScopeEntry[] {
  return loadBurpBackendState().scope;
}

export function addBurpScopeEntry(input: {
  pattern: string;
  include?: boolean;
  notes?: string;
}): BurpScopeEntry {
  const pattern = String(input.pattern || "").trim();

  if (!pattern) {
    throw new Error("A scope pattern is required.");
  }

  const entry: BurpScopeEntry = {
    id: createBurpId("scope"),
    pattern,
    include: input.include !== false,
    notes: String(input.notes || "").trim(),
    createdAt: new Date().toISOString(),
  };

  const state = loadBurpBackendState();

  state.scope.unshift(entry);
  saveBurpBackendState(state);

  return entry;
}

export function deleteBurpScopeEntry(
  id: string
): boolean {
  const state = loadBurpBackendState();
  const before = state.scope.length;

  state.scope = state.scope.filter(
    (entry) => entry.id !== id
  );

  if (state.scope.length === before) {
    return false;
  }

  saveBurpBackendState(state);
  return true;
}

export function listBurpHistory(
  limit = 100
): BurpHttpRecord[] {
  const state = loadBurpBackendState();

  return state.history
    .map(normalizeBurpHttpRecord)
    .slice(
      0,
      Math.max(1, Math.min(limit, BURP_HISTORY_LIMIT))
    );
}

export function getBurpHistoryRecord(
  id: string
): BurpHttpRecord | null {
  const state = loadBurpBackendState();

  const record = state.history.find(
    (item) => item.id === id
  );

  return record
    ? normalizeBurpHttpRecord(record)
    : null;
}

export function listBurpInterceptQueue(): BurpHttpRecord[] {
  const state = loadBurpBackendState();

  return state.history
    .map(normalizeBurpHttpRecord)
    .filter(
      (record) =>
        record.requestState === "held"
    );
}

export function getBurpInterceptState(): {
  enabled: boolean;
  queue: BurpHttpRecord[];
} {
  const state = loadBurpBackendState();

  return {
    enabled: Boolean(state.interceptEnabled),
    queue: state.history
      .map(normalizeBurpHttpRecord)
      .filter(
        (record) =>
          record.requestState === "held"
      ),
  };
}

export function setBurpInterceptEnabled(
  enabled: boolean
): {
  enabled: boolean;
  queue: BurpHttpRecord[];
} {
  const state = loadBurpBackendState();

  state.interceptEnabled = Boolean(enabled);

  saveBurpBackendState(state);

  return getBurpInterceptState();
}

export function getBurpRecordRepresentation(
  id: string
): {
  record: BurpHttpRecord;
  requestHex: string;
  responseHex: string;
} | null {
  const record = getBurpHistoryRecord(id);

  if (!record) {
    return null;
  }

  return {
    record,
    requestHex: bytesToHex(record.rawRequest),
    responseHex: bytesToHex(record.rawResponse),
  };
}

export function updateBurpRecordState(
  id: string,
  requestState: BurpRequestState
): BurpHttpRecord | null {
  const state = loadBurpBackendState();

  const index = state.history.findIndex(
    (record) => record.id === id
  );

  if (index < 0) {
    return null;
  }

  const now = new Date().toISOString();

  state.history[index] = normalizeBurpHttpRecord({
    ...state.history[index],
    requestState,
    stateUpdatedAt: now,
  });

  saveBurpBackendState(state);

  return state.history[index];
}

export function listBurpSiteMap(
  limit = 250
): BurpSiteMapEntry[] {
  const state = loadBurpBackendState();

  return state.siteMap.slice(
    0,
    Math.max(1, Math.min(limit, BURP_SITE_MAP_LIMIT))
  );
}

export function listBurpFindings(
  limit = 100
): BurpFinding[] {
  const state = loadBurpBackendState();

  return state.findings.slice(
    0,
    Math.max(1, Math.min(limit, BURP_FINDING_LIMIT))
  );
}

export function addBurpFinding(
  input: Omit<
    BurpFinding,
    "id" | "createdAt" | "updatedAt"
  >
): BurpFinding {
  const state = loadBurpBackendState();
  const now = new Date().toISOString();

  const finding: BurpFinding = {
    ...input,
    id: createBurpId("finding"),
    createdAt: now,
    updatedAt: now,
  };

  state.findings.unshift(finding);
  state.findings = state.findings.slice(
    0,
    BURP_FINDING_LIMIT
  );

  saveBurpBackendState(state);

  return finding;
}

export function getBurpBackendContext() {
  const state = loadBurpBackendState();

  const restUrl =
    String(process.env.BURP_REST_URL || "").trim();

  const apiKey =
    String(process.env.BURP_REST_API_KEY || "").trim();

  return {
    status: "ready",
    mode: restUrl && apiKey
      ? "burp-rest-ready"
      : "cyberlab-native",
    restConfigured: Boolean(restUrl && apiKey),
    restUrl: restUrl || null,
    targetCount: state.targets.length,
    inScopeTargetCount: state.targets.filter(
      (target) =>
        target.enabled && target.inScope
    ).length,
    scopeCount: state.scope.length,
    historyCount: state.history.length,
    siteMapCount: state.siteMap.length,
    findingCount: state.findings.length,
    storagePath: BURP_BACKEND_FILE,
    message:
      restUrl && apiKey
        ? "CyberLab Burp backend is configured to connect to Burp REST API."
        : "CyberLab Burp backend is ready; Burp REST API credentials are not configured.",
  };
}

export function createBurpInterceptedRequest(input: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  targetId?: string;
}): BurpHttpRecord {
  const url = normalizeBaseUrl(input.url);

  if (!isBurpTargetInScope(url.toString())) {
    throw new Error(
      "Target is not in CyberLab Burp scope. Add or enable the target before intercepting the request."
    );
  }

  const method =
    String(input.method || "GET")
      .trim()
      .toUpperCase();

  const headers: Record<string, string> = {
    ...(input.headers || {}),
  };

  const requestBody =
    method === "GET" || method === "HEAD"
      ? ""
      : input.body || "";

  const now = new Date().toISOString();

  const record: BurpHttpRecord = {
    id: createBurpId("http"),
    timestamp: now,
    method,
    url: url.toString(),
    status: null,
    requestHeaders: headers,
    requestBody,
    responseHeaders: {},
    responseBody: "",
    requestBytes: Buffer.byteLength(
      requestBody,
      "utf8"
    ),
    responseBytes: 0,
    durationMs: 0,
    mimeType: null,
    source: "cyberlab",
    targetId: input.targetId || null,
    requestState: "held",
    rawRequest: buildRawHttpRequest(
      method,
      url.toString(),
      headers,
      requestBody
    ),
    rawResponse: "",
    intercepted: true,
    stateUpdatedAt: now,
  };

  const state = loadBurpBackendState();

  state.history = state.history.filter(
    (item) => item.id !== record.id
  );

  state.history.unshift(record);
  state.history = state.history.slice(
    0,
    BURP_HISTORY_LIMIT
  );

  saveBurpBackendState(state);

  return record;
}

export function updateBurpInterceptedRequest(input: {
  id: string;
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): BurpHttpRecord {
  const record = getBurpHistoryRecord(input.id);

  if (!record) {
    throw new Error("Intercepted request was not found.");
  }

  if (record.requestState !== "held") {
    throw new Error(
      `Request cannot be edited because its state is "${record.requestState}".`
    );
  }

  const url = normalizeBaseUrl(input.url);

  if (!isBurpTargetInScope(url.toString())) {
    throw new Error(
      "Target is not in CyberLab Burp scope. Add or enable the target before updating the request."
    );
  }

  const method =
    String(input.method || "GET")
      .trim()
      .toUpperCase();

  const headers: Record<string, string> = {
    ...(input.headers || {}),
  };

  const requestBody =
    method === "GET" || method === "HEAD"
      ? ""
      : input.body || "";

  const now = new Date().toISOString();

  const updated: BurpHttpRecord = {
    ...record,
    method,
    url: url.toString(),
    requestHeaders: headers,
    requestBody,
    requestBytes: Buffer.byteLength(
      requestBody,
      "utf8"
    ),
    rawRequest: buildRawHttpRequest(
      method,
      url.toString(),
      headers,
      requestBody
    ),
    stateUpdatedAt: now,
  };

  const state = loadBurpBackendState();

  state.history = state.history.map((item) =>
    item.id === updated.id
      ? updated
      : item
  );

  saveBurpBackendState(state);

  return updated;
}

export async function forwardBurpInterceptedRequest(
  id: string
): Promise<BurpHttpRecord> {
  const record = getBurpHistoryRecord(id);

  if (!record) {
    throw new Error(
      "Intercepted request was not found."
    );
  }

  if (record.requestState !== "held") {
    throw new Error(
      `Request cannot be forwarded because its state is "${record.requestState}".`
    );
  }

  /*
   * Live Burp proxy traffic is already waiting inside the
   * Montoya request callback. CyberLab must NOT execute a
   * second HTTP request here.
   *
   * The Burp extension polls this record and releases the
   * original request when its state becomes "forwarded".
   */
  if (record.source === "burp-proxy") {
    return updateBurpRecordState(
      id,
      "forwarded"
    );
  }

  /*
   * CyberLab-created intercept records are not attached to
   * an original Burp request, so retain the existing
   * standalone execution behavior.
   */
  const forwarded = await executeBurpHttpRequest({
    method: record.method,
    url: record.url,
    headers: record.requestHeaders,
    body: record.requestBody,
    targetId: record.targetId || undefined,
    recordId: record.id,
    intercepted: true,
  });

  return forwarded;
}

export function dropBurpInterceptedRequest(
  id: string
): BurpHttpRecord | null {
  const record = getBurpHistoryRecord(id);

  if (!record) {
    return null;
  }

  if (record.requestState !== "held") {
    throw new Error(
      `Request cannot be dropped because its state is "${record.requestState}".`
    );
  }

  return updateBurpRecordState(
    id,
    "dropped"
  );
}

export async function executeBurpHttpRequest(input: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  targetId?: string;
  recordId?: string;
  intercepted?: boolean;
}): Promise<BurpHttpRecord> {
  const url = normalizeBaseUrl(input.url);

  if (!isBurpTargetInScope(url.toString())) {
    throw new Error(
      "Target is not in CyberLab Burp scope. Add or enable the target before sending requests."
    );
  }

  const method =
    String(input.method || "GET")
      .trim()
      .toUpperCase();

  const headers: Record<string, string> = {
    ...(input.headers || {}),
  };

  const started = Date.now();

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : input.body || undefined,
      redirect: "manual",
    });
  } catch (error: any) {
    throw new Error(
      error?.message ||
        "Unable to send HTTP request."
    );
  }

  const durationMs = Date.now() - started;

  const responseHeaders: Record<string, string> = {};

  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const responseBody = await response.text();

  const requestBody =
    method === "GET" || method === "HEAD"
      ? ""
      : input.body || "";

  const now = new Date().toISOString();

  const record: BurpHttpRecord = {
    id:
      typeof input.recordId === "string" &&
      input.recordId.trim()
        ? input.recordId.trim()
        : createBurpId("http"),
    timestamp: now,
    method,
    url: url.toString(),
    status: response.status,
    requestHeaders: headers,
    requestBody,
    responseHeaders,
    responseBody: responseBody.slice(0, 2_000_000),
    requestBytes: Buffer.byteLength(
      requestBody,
      "utf8"
    ),
    responseBytes: Buffer.byteLength(
      responseBody,
      "utf8"
    ),
    durationMs,
    mimeType:
      response.headers.get("content-type"),
    source: "cyberlab",
    targetId: input.targetId || null,
    requestState: "forwarded",
    rawRequest: buildRawHttpRequest(
      method,
      url.toString(),
      headers,
      requestBody
    ),
    rawResponse: buildRawHttpResponse(
      response.status,
      responseHeaders,
      responseBody.slice(0, 2_000_000)
    ),
    intercepted: Boolean(input.intercepted),
    stateUpdatedAt: now,
  };

  return ingestBurpHttpRecord(record);
}
