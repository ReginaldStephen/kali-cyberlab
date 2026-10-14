import { spawn } from "child_process";

const OBSERVIUM_ROOT = "/opt/observium";
const PHP_BIN = process.env.OBSERVIUM_PHP_BIN || "php";

const ALLOWED_VERSIONS = new Set([
  "v1",
  "v2c",
  "v3",
]);

const ALLOWED_TRANSPORTS = new Set([
  "udp",
  "udp6",
  "tcp",
  "tcp6",
]);

const ALLOWED_V3_LEVELS = new Set([
  "noAuthNoPriv",
  "authNoPriv",
  "authPriv",
]);

const ALLOWED_AUTH_ALGORITHMS = new Set([
  "MD5",
  "SHA",
  "SHA-224",
  "SHA-256",
  "SHA-384",
  "SHA-512",
]);

const ALLOWED_PRIV_ALGORITHMS = new Set([
  "DES",
  "AES",
  "AES-192",
  "AES-192-C",
  "AES-256",
  "AES-256-C",
]);

const COMMAND_TIMEOUT_MS = 90_000;
const MAX_OUTPUT = 24_000;

export interface ObserviumDeviceCredentials {
  hostname: string;
  version: string;
  port?: number;
  transport?: string;
  context?: string;

  community?: string;

  securityLevel?: string;
  username?: string;
  authPassword?: string;
  authAlgorithm?: string;
  privacyPassword?: string;
  privacyAlgorithm?: string;
}

export interface ObserviumCommandResult {
  ok: boolean;
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  observiumResult:
    | "success"
    | "auth_failed"
    | "network_failed"
    | "duplicate"
    | "failed";
}

function cleanString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  const result = String(value ?? "").trim();

  if (!result) {
    throw new Error(`${field} is required.`);
  }

  if (result.length > maxLength) {
    throw new Error(`${field} is too long.`);
  }

  if (/[\u0000-\u001f\u007f]/.test(result)) {
    throw new Error(`${field} contains invalid control characters.`);
  }

  return result;
}

function validateHostname(value: unknown): string {
  const hostname = cleanString(value, "Hostname or IP address", 253);

  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9.:%_-]*$/.test(hostname)
  ) {
    throw new Error(
      "Hostname or IP address contains unsupported characters.",
    );
  }

  return hostname;
}

function validatePort(value: unknown): number {
  const port =
    value === undefined ||
    value === null ||
    value === ""
      ? 161
      : Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SNMP port must be between 1 and 65535.");
  }

  return port;
}

function validateTransport(value: unknown): string {
  const transport =
    value === undefined ||
    value === null ||
    value === ""
      ? "udp"
      : String(value).trim().toLowerCase();

  if (!ALLOWED_TRANSPORTS.has(transport)) {
    throw new Error(
      "Unsupported SNMP transport.",
    );
  }

  return transport;
}

function validateSecret(
  value: unknown,
  field: string,
  required = false,
): string {
  const result = String(value ?? "");

  if (required && !result) {
    throw new Error(`${field} is required.`);
  }

  if (result.length > 512) {
    throw new Error(`${field} is too long.`);
  }

  if (result.includes("\u0000")) {
    throw new Error(`${field} contains an invalid character.`);
  }

  return result;
}

function validateCredentialInput(
  input: ObserviumDeviceCredentials,
): ObserviumDeviceCredentials {
  const version = String(input.version || "")
    .trim()
    .toLowerCase();

  if (!ALLOWED_VERSIONS.has(version)) {
    throw new Error(
      "SNMP version must be v1, v2c, or v3.",
    );
  }

  const hostname = validateHostname(input.hostname);
  const port = validatePort(input.port);
  const transport = validateTransport(input.transport);

  const context =
    input.context === undefined ||
    input.context === null ||
    input.context === ""
      ? undefined
      : cleanString(input.context, "SNMP context", 255);

  if (version === "v1" || version === "v2c") {
    const community = validateSecret(
      input.community,
      "SNMP community",
      true,
    );

    return {
      hostname,
      version,
      port,
      transport,
      context,
      community,
    };
  }

  const securityLevel = String(
    input.securityLevel || "noAuthNoPriv",
  );

  if (!ALLOWED_V3_LEVELS.has(securityLevel)) {
    throw new Error(
      "Unsupported SNMPv3 security level.",
    );
  }

  const username = validateSecret(
    input.username,
    "SNMPv3 username",
    true,
  );

  const result: ObserviumDeviceCredentials = {
    hostname,
    version,
    port,
    transport,
    context,
    securityLevel,
    username,
  };

  if (
    securityLevel === "authNoPriv" ||
    securityLevel === "authPriv"
  ) {
    result.authPassword = validateSecret(
      input.authPassword,
      "SNMPv3 authentication password",
      true,
    );

    const authAlgorithm =
      String(input.authAlgorithm || "SHA").trim();

    if (!ALLOWED_AUTH_ALGORITHMS.has(authAlgorithm)) {
      throw new Error(
        "Unsupported SNMPv3 authentication algorithm.",
      );
    }

    result.authAlgorithm = authAlgorithm;
  }

  if (securityLevel === "authPriv") {
    result.privacyPassword = validateSecret(
      input.privacyPassword,
      "SNMPv3 privacy password",
      true,
    );

    const privacyAlgorithm =
      String(input.privacyAlgorithm || "AES").trim();

    if (!ALLOWED_PRIV_ALGORITHMS.has(privacyAlgorithm)) {
      throw new Error(
        "Unsupported SNMPv3 privacy algorithm.",
      );
    }

    result.privacyAlgorithm = privacyAlgorithm;
  }

  return result;
}

function stripAnsi(value: string): string {
  return value
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, "");
}

function redactOutput(value: string): string {
  return stripAnsi(value)
    .replace(
      /(\b(?:community|password|authpass|authPassword|cryptopass|privacyPassword)\b\s*[:=]\s*)\S+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /(-(?:p|c|P)\s+)\S+/g,
      "$1[REDACTED]",
    )
    .slice(0, MAX_OUTPUT);
}

function buildAddDeviceArgs(
  input: ObserviumDeviceCredentials,
  testOnly: boolean,
): string[] {
  const args: string[] = [];

  if (testOnly) {
    args.push("-t");
  }

  args.push(input.hostname);

  if (input.version === "v1" || input.version === "v2c") {
    args.push(
      input.community || "",
      input.version,
      String(input.port || 161),
      input.transport || "udp",
    );

    if (input.context) {
      args.push(input.context);
    }

    return args;
  }

  const level = input.securityLevel || "noAuthNoPriv";

  if (level === "noAuthNoPriv") {
    args.push(
      "nanp",
      "v3",
      input.username || "",
      String(input.port || 161),
      input.transport || "udp",
    );
  } else if (level === "authNoPriv") {
    args.push(
      "anp",
      "v3",
      input.username || "",
      input.authPassword || "",
      input.authAlgorithm || "SHA",
      String(input.port || 161),
      input.transport || "udp",
    );
  } else {
    args.push(
      "ap",
      "v3",
      input.username || "",
      input.authPassword || "",
      input.privacyPassword || "",
      input.authAlgorithm || "SHA",
      input.privacyAlgorithm || "AES",
      String(input.port || 161),
      input.transport || "udp",
    );
  }

  if (input.context) {
    args.push(input.context);
  }

  return args;
}

function runProcess(
  executable: string,
  args: string[],
  timeoutMs = COMMAND_TIMEOUT_MS,
  successPattern?: RegExp,
): Promise<ObserviumCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: OBSERVIUM_ROOT,
      env: {
        ...process.env,
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const finish = (
      exitCode: number | null,
      signal: string | null,
    ) => {
      if (settled) return;
      settled = true;

      const safeStdout = redactOutput(stdout);
      const safeStderr = redactOutput(stderr);
      const combined = `${safeStdout}\n${safeStderr}`;

      let observiumResult: ObserviumCommandResult["observiumResult"] =
        "failed";

      if (timedOut) {
        observiumResult = "network_failed";
      } else if (
        /Already got device with hostname/i.test(combined)
      ) {
        observiumResult = "duplicate";
      } else if (
        exitCode === 0 &&
        successPattern &&
        successPattern.test(combined)
      ) {
        // A confirmed completion marker takes precedence over incidental
        // diagnostic words in verbose Observium output.
        observiumResult = "success";
      } else if (
        /Could not ping|Could not resolve|not accessible/i.test(combined)
      ) {
        observiumResult = "network_failed";
      } else if (
        /authentication|auth(?:entication)? failed|SNMP.*(?:failed|error)|No response/i.test(
          combined,
        )
      ) {
        observiumResult = "auth_failed";
      }

      resolve({
        ok:
          !timedOut &&
          exitCode === 0 &&
          observiumResult === "success",
        exitCode,
        signal,
        stdout: safeStdout,
        stderr: safeStderr,
        timedOut,
        observiumResult,
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;

      try {
        child.kill("SIGTERM");
      } catch {
        // Process may already have exited.
      }

      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // Process may already have exited.
        }
      }, 3000);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);

      if (stdout.length > MAX_OUTPUT * 2) {
        stdout = stdout.slice(0, MAX_OUTPUT * 2);
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);

      if (stderr.length > MAX_OUTPUT * 2) {
        stderr = stderr.slice(0, MAX_OUTPUT * 2);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);

      if (settled) return;

      settled = true;
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finish(code, signal);
    });
  });
}

export function validateObserviumDeviceInput(
  input: ObserviumDeviceCredentials,
): ObserviumDeviceCredentials {
  return validateCredentialInput(input);
}

export async function testObserviumDevice(
  input: ObserviumDeviceCredentials,
): Promise<ObserviumCommandResult> {
  const validated = validateCredentialInput(input);

  const result = await runProcess(
    PHP_BIN,
    [
      `${OBSERVIUM_ROOT}/add_device.php`,
      "-t",
      ...buildAddDeviceArgs(validated, true),
    ],
  );

  /*
   * Observium's add_device() returns:
   *   -1    test succeeded
   *    0    SNMP/authentication failure
   *   FALSE network/DNS/reachability failure
   *
   * add_device.php does not necessarily expose those return values
   * as the process exit code, so classify the output explicitly.
   */
  const combined = `${result.stdout}\n${result.stderr}`;

  if (
    !result.timedOut &&
    result.exitCode === 0 &&
    /Try to add .*:/i.test(result.stdout) &&
    !/Could not ping|Could not resolve|Already got device|authentication|auth(?:entication)? failed|SNMP.*(?:failed|error)|No response/i.test(
      combined,
    )
  ) {
    return {
      ...result,
      ok: true,
      observiumResult: "success",
    };
  }

  return result;
}

export async function addObserviumDevice(
  input: ObserviumDeviceCredentials,
): Promise<ObserviumCommandResult> {
  const validated = validateCredentialInput(input);

  return runProcess(
    PHP_BIN,
    [
      `${OBSERVIUM_ROOT}/add_device.php`,
      ...buildAddDeviceArgs(validated, false),
    ],
    COMMAND_TIMEOUT_MS,
    /Devices success:\s*\d+|Added device|Device .* added/i,
  );
}

export async function discoverObserviumDevice(
  deviceId: number,
): Promise<ObserviumCommandResult> {
  if (
    !Number.isInteger(deviceId) ||
    deviceId <= 0
  ) {
    throw new Error("Invalid Observium device ID.");
  }

  return runProcess(
    PHP_BIN,
    [
      `${OBSERVIUM_ROOT}/discovery.php`,
      "-h",
      String(deviceId),
    ],
    COMMAND_TIMEOUT_MS,
    /Completed discovery run|Devices discovered|Discovery.*completed/i,
  );
}

export async function pollObserviumDevice(
  deviceId: number,
): Promise<ObserviumCommandResult> {
  if (
    !Number.isInteger(deviceId) ||
    deviceId <= 0
  ) {
    throw new Error("Invalid Observium device ID.");
  }

  return runProcess(
    PHP_BIN,
    [
      `${OBSERVIUM_ROOT}/poller.php`,
      "-h",
      String(deviceId),
    ],
    COMMAND_TIMEOUT_MS,
    /Completed polling run|Devices Polled\s+\d+|polling run.*completed/i,
  );
}
