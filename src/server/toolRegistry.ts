import { execFile } from "child_process";
import { promisify } from "util";
import http from "http";
import https from "https";

const execFileAsync = promisify(execFile);

export type ToolLifecycle =
  | "persistent"
  | "external"
  | "on-demand"
  | "optional";

export type ToolCategory =
  | "platform"
  | "service"
  | "integration"
  | "security-tool"
  | "network-tool"
  | "observability";

export type ToolState =
  | "ready"
  | "available"
  | "running"
  | "installed"
  | "not-installed"
  | "not-configured"
  | "unhealthy"
  | "offline"
  | "unknown";

export interface ToolRegistryEntry {
  id: string;
  name: string;
  category: ToolCategory;
  lifecycle: ToolLifecycle;

  command?: string;
  service?: string;
  url?: string;

  installed: boolean;
  configured: boolean;
  processRunning: boolean;
  healthy: boolean;
  integrated: boolean;
  ready: boolean;

  state: ToolState;
  version: string | null;
  responseTimeMs: number | null;
  message: string;

  checkedAt: string;
}

export interface ToolRegistrySnapshot {
  status: "ready" | "degraded" | "critical";
  ready: boolean;
  timestamp: string;

  summary: {
    total: number;
    ready: number;
    available: number;
    running: number;
    unhealthy: number;
    notInstalled: number;
    notConfigured: number;
  };

  entries: ToolRegistryEntry[];
}

type ToolDefinition = {
  id: string;
  name: string;
  category: ToolCategory;
  lifecycle: ToolLifecycle;

  command?: string;
  service?: string;
  urlEnv?: string;

  configured?: () => boolean;
  integrated?: boolean;

  health?: "http" | "service" | "process" | "none";
};

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "cyberlab",
    name: "Kali CyberLab",
    category: "platform",
    lifecycle: "persistent",
    health: "process",
    integrated: true,
  },

  {
    id: "greenbone-gvmd",
    name: "Greenbone / GVMD",
    category: "service",
    lifecycle: "persistent",
    service: "gvmd.service",
    health: "service",
    integrated: true,
  },
  {
    id: "greenbone-ospd",
    name: "Greenbone / OSPd OpenVAS",
    category: "service",
    lifecycle: "persistent",
    service: "ospd-openvas.service",
    health: "service",
    integrated: true,
  },
  {
    id: "greenbone-redis",
    name: "Greenbone Redis",
    category: "service",
    lifecycle: "persistent",
    service: "redis-server@openvas.service",
    health: "service",
    integrated: true,
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "service",
    lifecycle: "persistent",
    service: "postgresql@18-main.service",
    health: "service",
  },
  {
    id: "mariadb",
    name: "MariaDB",
    category: "service",
    lifecycle: "persistent",
    service: "mariadb.service",
    health: "service",
  },
  {
    id: "docker",
    name: "Docker",
    category: "service",
    lifecycle: "persistent",
    service: "docker.service",
    health: "service",
  },

  {
    id: "defectdojo",
    name: "DefectDojo",
    category: "integration",
    lifecycle: "external",
    urlEnv: "DEFECTDOJO_URL",
    configured: () => Boolean(process.env.DEFECTDOJO_URL),
    health: "http",
    integrated: true,
  },
  {
    id: "observium",
    name: "Observium",
    category: "observability",
    lifecycle: "external",
    urlEnv: "OBSERVIUM_URL",
    configured: () => Boolean(process.env.OBSERVIUM_URL),
    health: "http",
    integrated: true,
  },
  {
    id: "greenbone-web",
    name: "Greenbone Web / GSAD",
    category: "integration",
    lifecycle: "external",
    urlEnv: "GREENBONE_URL",
    configured: () => Boolean(process.env.GREENBONE_URL),
    health: "http",
    integrated: true,
  },

  {
    id: "burp-suite",
    name: "Burp Suite",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "burpsuite",
    health: "process",
    integrated: true,
  },
  {
    id: "owasp-zap",
    name: "OWASP ZAP",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "zaproxy",
    health: "process",
    integrated: false,
  },
  {
    id: "metasploit",
    name: "Metasploit Framework",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "msfconsole",
    health: "process",
    integrated: false,
  },

  {
    id: "nmap",
    name: "Nmap",
    category: "network-tool",
    lifecycle: "on-demand",
    command: "nmap",
    health: "none",
    integrated: true,
  },
  {
    id: "nuclei",
    name: "Nuclei",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "nuclei",
    health: "none",
    integrated: true,
  },
  {
    id: "httpx",
    name: "HTTPX",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "httpx-toolkit",
    health: "none",
    integrated: true,
  },
  {
    id: "tshark",
    name: "TShark",
    category: "network-tool",
    lifecycle: "on-demand",
    command: "tshark",
    health: "process",
    integrated: true,
  },
  {
    id: "tcpdump",
    name: "TCPDump",
    category: "network-tool",
    lifecycle: "on-demand",
    command: "tcpdump",
    health: "process",
    integrated: true,
  },
  {
    id: "curl",
    name: "cURL",
    category: "network-tool",
    lifecycle: "on-demand",
    command: "curl",
    health: "none",
    integrated: true,
  },
  {
    id: "wget",
    name: "Wget",
    category: "network-tool",
    lifecycle: "on-demand",
    command: "wget",
    health: "none",
    integrated: true,
  },
  {
    id: "nikto",
    name: "Nikto",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "nikto",
    health: "none",
    integrated: true,
  },
  {
    id: "sqlmap",
    name: "SQLMap",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "sqlmap",
    health: "none",
    integrated: true,
  },
  {
    id: "ffuf",
    name: "ffuf",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "ffuf",
    health: "none",
    integrated: true,
  },
  {
    id: "gobuster",
    name: "Gobuster",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "gobuster",
    health: "none",
    integrated: true,
  },
  {
    id: "hydra",
    name: "Hydra",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "hydra",
    health: "none",
    integrated: false,
  },
  {
    id: "whatweb",
    name: "WhatWeb",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "whatweb",
    health: "none",
    integrated: true,
  },
  {
    id: "enum4linux",
    name: "enum4linux",
    category: "security-tool",
    lifecycle: "on-demand",
    command: "enum4linux",
    health: "none",
    integrated: false,
  },

  {
    id: "wazuh",
    name: "Wazuh Manager",
    category: "service",
    lifecycle: "optional",
    service: "wazuh-manager.service",
    health: "service",
    integrated: true,
  },
  {
    id: "wazuh-agent",
    name: "Wazuh Agent",
    category: "service",
    lifecycle: "optional",
    service: "wazuh-agent.service",
    health: "service",
    integrated: true,
  },
  {
    id: "enum4linux-ng",
    name: "enum4linux-ng",
    category: "security-tool",
    lifecycle: "optional",
    command: "enum4linux-ng",
    health: "none",
    integrated: false,
  },
];

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${quoteShell(command)}`], {
      timeout: 1500,
      maxBuffer: 32 * 1024,
    });

    return true;
  } catch {
    return false;
  }
}

async function getCommandVersion(
  command: string
): Promise<string | null> {
  const candidates = [
    ["--version"],
    ["-version"],
    ["version"],
    ["-V"],
  ];

  for (const args of candidates) {
    try {
      const result = await execFileAsync(command, args, {
        timeout: 2000,
        maxBuffer: 64 * 1024,
      });

      const output =
        `${result.stdout || ""}\n${result.stderr || ""}`
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .find(Boolean);

      if (output) {
        return output.slice(0, 120);
      }
    } catch (error: any) {
      const output =
        `${error?.stdout || ""}\n${error?.stderr || ""}`
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .find(Boolean);

      if (output) {
        return output.slice(0, 120);
      }
    }
  }

  return null;
}

async function serviceState(
  service: string
): Promise<{
  installed: boolean;
  running: boolean;
  version: string | null;
  message: string;
}> {
  try {
    const result = await execFileAsync(
      "systemctl",
      ["is-active", service],
      {
        timeout: 2000,
        maxBuffer: 32 * 1024,
      }
    );

    const active =
      (result.stdout || "").trim() === "active";

    return {
      installed: true,
      running: active,
      version: null,
      message: active
        ? "System service is active."
        : `System service state: ${(result.stdout || "").trim() || "unknown"}.`,
    };
  } catch (error: any) {
    const output =
      `${error?.stdout || ""}\n${error?.stderr || ""}`
        .trim();

    if (
      /could not be found|not-found|not found/i.test(output)
    ) {
      return {
        installed: false,
        running: false,
        version: null,
        message: "System service is not installed.",
      };
    }

    const state =
      String(error?.stdout || "")
        .trim();

    return {
      installed: true,
      running: state === "active",
      version: null,
      message:
        state
          ? `System service state: ${state}.`
          : "System service is installed but not active.",
    };
  }
}

async function processRunning(
  pattern: string,
  includeCurrentPid = false
): Promise<boolean> {
  try {
    const result = await execFileAsync(
      "pgrep",
      ["-f", pattern],
      {
        timeout: 1500,
        maxBuffer: 32 * 1024,
      }
    );

    const currentPid =
      String(process.pid);

    return Boolean(
      (result.stdout || "")
        .trim()
        .split("\n")
        .map((pid) => pid.trim())
        .filter(
          (pid) =>
            Boolean(pid) &&
            (includeCurrentPid ||
              pid !== currentPid)
        )
        .length
    );
  } catch {
    return false;
  }
}

async function httpHealth(
  url: string
): Promise<{
  healthy: boolean;
  responseTimeMs: number | null;
  message: string;
}> {
  const started = Date.now();

  return new Promise((resolve) => {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      resolve({
        healthy: false,
        responseTimeMs: null,
        message: "Configured URL is invalid.",
      });
      return;
    }

    const client =
      parsed.protocol === "https:"
        ? https
        : parsed.protocol === "http:"
          ? http
          : null;

    if (!client) {
      resolve({
        healthy: false,
        responseTimeMs: null,
        message: `Unsupported URL protocol: ${parsed.protocol}`,
      });
      return;
    }

    const request = client.request(
      parsed,
      {
        method: "GET",
        timeout: 10000,
        rejectUnauthorized: false,
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        response.resume();

        resolve({
          healthy:
            statusCode >= 200 &&
            statusCode < 500,
          responseTimeMs:
            Date.now() - started,
          message:
            statusCode >= 200 &&
            statusCode < 500
              ? `HTTP ${statusCode}.`
              : `HTTP ${statusCode}.`,
        });
      }
    );

    request.once("timeout", () => {
      request.destroy();

      resolve({
        healthy: false,
        responseTimeMs:
          Date.now() - started,
        message: "Connection timed out.",
      });
    });

    request.once("error", (error: Error) => {
      resolve({
        healthy: false,
        responseTimeMs:
          Date.now() - started,
        message:
          error.message ||
          "Unable to connect.",
      });
    });

    request.end();
  });
}

function quoteShell(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function inspectDefinition(
  definition: ToolDefinition
): Promise<ToolRegistryEntry> {
  const checkedAt = new Date().toISOString();

  let installed = true;
  let configured =
    definition.configured
      ? definition.configured()
      : true;

  let processIsRunning = false;
  let healthy = false;
  let version: string | null = null;
  let responseTimeMs: number | null = null;
  let message = "";

  if (definition.command) {
    installed =
      await commandExists(
        definition.command
      );

    if (installed) {
      version =
        await getCommandVersion(
          definition.command
        );

      if (
        definition.health === "process"
      ) {
        processIsRunning =
          await processRunning(
            definition.command
          );
      }
    } else {
      message =
        "Command is not installed.";
    }
  }

  if (definition.service) {
    const service =
      await serviceState(
        definition.service
      );

    installed =
      service.installed;

    processIsRunning =
      service.running;

    healthy =
      service.running;

    message =
      service.message;
  }

  if (definition.urlEnv) {
    const url =
      process.env[
        definition.urlEnv
      ] || "";

    configured =
      Boolean(url);

    if (url) {
      let result =
        await httpHealth(url);

      /*
       * Observium is an external PHP/Apache application. Its web root
       * can occasionally miss the registry probe even while the service
       * is healthy and immediately reachable. Retry only this integration
       * so the generic HTTP health semantics remain unchanged for all
       * other external services.
       */
      if (
        definition.id === "observium" &&
        !result.healthy
      ) {
        const retry =
          await httpHealth(url);

        if (retry.healthy) {
          result = retry;
        }
      }

      healthy =
        result.healthy;

      responseTimeMs =
        result.responseTimeMs;

      message =
        result.message;
    } else {
      message =
        `${definition.urlEnv} is not configured.`;
    }
  }

  if (
    definition.id ===
    "cyberlab"
  ) {
    processIsRunning =
      processIsRunning ||
      await processRunning(
        "dist/server.cjs",
        true
      );

    healthy =
      processIsRunning;

    configured = true;
    installed = true;

    message =
      processIsRunning
        ? "CyberLab production server is running."
        : "CyberLab production server is not running.";
  }

  if (
    definition.id ===
    "burp-suite"
  ) {
    const bridgeConfigured =
      Boolean(
        process.env
          .CYBERLAB_BURP_BRIDGE_TOKEN
      );

    configured =
      installed &&
      bridgeConfigured;

    healthy =
      installed;

    message =
      installed
        ? bridgeConfigured
          ? processIsRunning
            ? "Burp Suite is running and the CyberLab bridge is configured."
            : "Burp Suite is installed; CyberLab bridge is configured; Burp is on-demand."
          : "Burp Suite is installed but the CyberLab bridge token is not configured."
        : "Burp Suite is not installed.";
  }

  if (
    definition.lifecycle ===
    "on-demand" &&
    definition.command &&
    installed
  ) {
    /*
     * On-demand tools do not need a persistent process.
     * Installation is sufficient for readiness; processRunning
     * remains a separate operational signal.
     */
    healthy = true;

    message =
      processIsRunning
        ? "Installed, available, and currently running."
        : "Installed and available for explicit on-demand use.";
  }

  if (
    definition.lifecycle ===
    "optional" &&
    !installed
  ) {
    configured = false;
    healthy = false;
  }

  const ready =
    installed &&
    configured &&
    healthy &&
    (
      definition.lifecycle !==
      "persistent" ||
      processIsRunning
    );

  let state: ToolState;

  if (!installed) {
    state =
      definition.lifecycle ===
      "optional"
        ? "not-installed"
        : "not-installed";
  } else if (!configured) {
    state = "not-configured";
  } else if (ready) {
    state =
      definition.lifecycle ===
      "persistent"
        ? "running"
        : definition.lifecycle ===
          "on-demand"
          ? "available"
          : "ready";
  } else if (
    processIsRunning
  ) {
    state = "running";
  } else if (!healthy) {
    state =
      definition.lifecycle ===
      "external"
        ? "offline"
        : "unhealthy";
  } else {
    state = "available";
  }

  if (
    installed &&
    !message
  ) {
    message =
      definition.lifecycle ===
      "on-demand"
        ? "Installed and available for explicit on-demand use."
        : healthy
          ? "Available."
          : "Installed but not healthy.";
  }

  return {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    lifecycle: definition.lifecycle,

    command: definition.command,
    service: definition.service,
    url:
      definition.urlEnv
        ? process.env[
            definition.urlEnv
          ] || ""
        : undefined,

    installed,
    configured,
    processRunning: processIsRunning,
    healthy,
    integrated:
      definition.integrated === true,
    ready,

    state,
    version,
    responseTimeMs,
    message,

    checkedAt,
  };
}

export async function getToolRegistrySnapshot(): Promise<ToolRegistrySnapshot> {
  const entries =
    await Promise.all(
      TOOL_DEFINITIONS.map(
        inspectDefinition
      )
    );

  const summary = {
    total: entries.length,

    ready:
      entries.filter(
        (entry) => entry.ready
      ).length,

    available:
      entries.filter(
        (entry) =>
          entry.installed &&
          entry.configured &&
          entry.healthy
      ).length,

    running:
      entries.filter(
        (entry) =>
          entry.processRunning
      ).length,

    unhealthy:
      entries.filter(
        (entry) =>
          entry.installed &&
          !entry.healthy &&
          entry.lifecycle !==
            "optional"
      ).length,

    notInstalled:
      entries.filter(
        (entry) =>
          !entry.installed
      ).length,

    notConfigured:
      entries.filter(
        (entry) =>
          entry.installed &&
          !entry.configured
      ).length,
  };

  const criticalEntries =
    entries.filter(
      (entry) =>
        entry.lifecycle ===
          "persistent" &&
        !entry.ready
    );

  const degradedEntries =
    entries.filter(
      (entry) =>
        entry.lifecycle ===
          "external" &&
        !entry.ready
    );

  const status =
    criticalEntries.length > 0
      ? "critical"
      : degradedEntries.length > 0
        ? "degraded"
        : "ready";

  return {
    status,
    ready:
      status === "ready",
    timestamp:
      new Date().toISOString(),
    summary,
    entries,
  };
}
