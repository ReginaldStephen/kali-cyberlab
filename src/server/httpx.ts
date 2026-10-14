import fs from "fs";
import path from "path";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function spawnHttpx(
  args: string[],
  timeoutMs: number,
  stdinData?: string,
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      HTTPX_BINARY,
      args,
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    if (stdinData !== undefined) {
      child.stdin.write(stdinData);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");

      setTimeout(() => {
        if (!settled) {
          child.kill("SIGKILL");
        }
      }, 2_000);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code === 0) {
        resolve({
          stdout,
          stderr,
        });
        return;
      }

      const diagnosticParts = [
        timedOut
          ? `HTTPX process timed out after ${timeoutMs}ms.`
          : null,
        code !== null
          ? `exit code ${code}`
          : null,
        signal
          ? `signal ${signal}`
          : null,
        stderr.trim()
          ? `stderr: ${stderr.trim().slice(-4000)}`
          : null,
      ].filter(Boolean);

      const error = new Error(
        `HTTPX command failed: ${HTTPX_BINARY} ${args.join(" ")}${
          diagnosticParts.length
            ? ` (${diagnosticParts.join("; ")})`
            : ""
        }`,
      ) as Error & {
        code?: number | null;
        signal?: NodeJS.Signals | null;
        stdout?: string;
        stderr?: string;
        timedOut?: boolean;
      };

      error.code = code;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      error.timedOut = timedOut;

      reject(error);
    });
  });
}

const HTTPX_BINARY =
  process.env.HTTPX_BINARY?.trim() ||
  "/usr/bin/httpx-toolkit";

const DATA_DIR = path.resolve("data");
const RESULTS_FILE = path.join(
  DATA_DIR,
  "cyberlab-httpx-results.json"
);

const MAX_RESULTS = 500;
const MAX_BATCH_TARGETS = 50;
const DEFAULT_TIMEOUT_SECONDS = 10;
const MAX_TIMEOUT_SECONDS = 30;

export interface HttpxTlsInfo {
  host?: string | null;
  port?: number | string | null;
  probeStatus?: boolean | null;
  tlsVersion?: string | null;
  cipher?: string | null;
  notBefore?: string | null;
  notAfter?: string | null;
  subjectDn?: string | null;
  subjectCn?: string | null;
  subjectAn?: string[];
  serial?: string | null;
  issuerDn?: string | null;
  issuerCn?: string | null;
  issuerOrg?: string[];
  fingerprintMd5?: string | null;
  fingerprintSha1?: string | null;
  fingerprintSha256?: string | null;
  wildcardCertificate?: boolean | null;
  tlsConnection?: string | null;
  sni?: string | null;
}

export interface HttpxResult {
  id: string;
  target: string;
  timestamp: string;

  url: string;
  input: string;
  finalUrl: string | null;

  statusCode: number | null;
  contentLength: number | null;
  contentType: string | null;
  title: string | null;
  webServer: string | null;
  method: string | null;
  technologies: string[];
  cpe: Array<Record<string, unknown>>;
  responseTime: string | null;

  ip: string | null;
  ipv4: string[];
  ipv6: string[];
  cname: string | null;
  cdn: string | null;

  location: string | null;
  probe: boolean | null;

  redirectChain: unknown[];
  responseHeaders: Record<string, string>;
  rawResponseHeaders: string | null;
  request: string | null;
  body: string | null;
  bodyPreview: string | null;
  responseEncoding: "plain" | "base64" | null;
  wordCount: number | null;
  lineCount: number | null;

  faviconHash: string | null;
  faviconMd5: string | null;
  faviconPath: string | null;
  faviconUrl: string | null;

  jarmHash: string | null;
  http2: boolean | null;
  websocket: boolean | null;

  tls: HttpxTlsInfo | null;

  raw: Record<string, unknown>;
}

export type HttpxInspection =
  | "standard"
  | "headers"
  | "body"
  | "full"
  | "base64";

export interface HttpxProbeOptions {
  timeoutSeconds?: number;
  followRedirects?: boolean;
  techDetect?: boolean;
  inspection?: HttpxInspection;
}

interface PersistedHttpxState {
  results: HttpxResult[];
}

function ensureDataDirectory(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState(): PersistedHttpxState {
  ensureDataDirectory();

  if (!fs.existsSync(RESULTS_FILE)) {
    return { results: [] };
  }

  try {
    const raw = fs.readFileSync(
      RESULTS_FILE,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    if (
      parsed &&
      Array.isArray(parsed.results)
    ) {
      return {
        results: parsed.results.slice(
          0,
          MAX_RESULTS
        ),
      };
    }
  } catch {
    // Return an empty state if the persistence file
    // is unavailable or malformed.
  }

  return { results: [] };
}

function saveState(
  state: PersistedHttpxState
): void {
  ensureDataDirectory();

  const tempFile = `${RESULTS_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      {
        results: state.results.slice(
          0,
          MAX_RESULTS
        ),
      },
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(tempFile, RESULTS_FILE);
}

function normalizeTarget(
  target: unknown
): string {
  if (typeof target !== "string") {
    throw new Error(
      "HTTPX target must be a string."
    );
  }

  const normalized = target.trim();

  if (!normalized) {
    throw new Error(
      "HTTPX target cannot be empty."
    );
  }

  if (normalized.length > 2048) {
    throw new Error(
      "HTTPX target is too long."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(
      "HTTPX target must be a valid HTTP or HTTPS URL."
    );
  }

  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "HTTPX only accepts HTTP and HTTPS targets."
    );
  }

  return parsed.toString();
}

function normalizeString(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function normalizeNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeBoolean(
  value: unknown
): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return null;
}

function normalizeTechnologies(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string"
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeHttpxResult(
  raw: Record<string, unknown>,
  fallbackTarget: string,
  inspection: HttpxInspection = "standard"
): HttpxResult {
  const url =
    normalizeString(raw.url) ||
    normalizeString(raw.final_url) ||
    fallbackTarget;

  const input =
    normalizeString(raw.input) ||
    fallbackTarget;

  const technologies =
    normalizeTechnologies(
      raw.tech ||
        raw.technologies ||
        raw.technology
    );

  const probe =
    normalizeBoolean(
      raw.status_code !== undefined
        ? true
        : raw.probe
    );

  const rawTls =
    raw.tls &&
    typeof raw.tls === "object" &&
    !Array.isArray(raw.tls)
      ? raw.tls as Record<string, unknown>
      : null;

  const rawHeaders =
    raw.header &&
    typeof raw.header === "object" &&
    !Array.isArray(raw.header)
      ? raw.header as Record<string, unknown>
      : {};

  const responseHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawHeaders)) {
    const normalizedValue = normalizeString(value);
    if (normalizedValue !== null) {
      responseHeaders[key] = normalizedValue;
    }
  }

  const rawFingerprintHash =
    rawTls?.fingerprint_hash &&
    typeof rawTls.fingerprint_hash === "object" &&
    !Array.isArray(rawTls.fingerprint_hash)
      ? rawTls.fingerprint_hash as Record<string, unknown>
      : {};

  const tls: HttpxTlsInfo | null =
    rawTls
      ? {
          host: normalizeString(rawTls.host),
          port:
            normalizeNumber(rawTls.port) ??
            normalizeString(rawTls.port),
          probeStatus:
            normalizeBoolean(rawTls.probe_status),
          tlsVersion:
            normalizeString(rawTls.tls_version),
          cipher:
            normalizeString(rawTls.cipher),
          notBefore:
            normalizeString(rawTls.not_before),
          notAfter:
            normalizeString(rawTls.not_after),
          subjectDn:
            normalizeString(rawTls.subject_dn),
          subjectCn:
            normalizeString(rawTls.subject_cn),
          subjectAn:
            normalizeTechnologies(rawTls.subject_an),
          serial:
            normalizeString(rawTls.serial),
          issuerDn:
            normalizeString(rawTls.issuer_dn),
          issuerCn:
            normalizeString(rawTls.issuer_cn),
          issuerOrg:
            normalizeTechnologies(rawTls.issuer_org),
          fingerprintMd5:
            normalizeString(rawFingerprintHash.md5),
          fingerprintSha1:
            normalizeString(rawFingerprintHash.sha1),
          fingerprintSha256:
            normalizeString(rawFingerprintHash.sha256),
          wildcardCertificate:
            normalizeBoolean(rawTls.wildcard_certificate),
          tlsConnection:
            normalizeString(rawTls.tls_connection),
          sni:
            normalizeString(rawTls.sni),
        }
      : null;

  return {
    id: `httpx-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,

    target: fallbackTarget,
    timestamp:
      new Date().toISOString(),

    url,
    input,

    finalUrl:
      normalizeString(raw.final_url),

    statusCode:
      normalizeNumber(
        raw.status_code
      ),

    contentLength:
      normalizeNumber(
        raw.content_length
      ),

    contentType:
      normalizeString(
        raw.content_type
      ),

    title:
      normalizeString(
        raw.title
      ),

    webServer:
      normalizeString(
        raw.webserver ||
          raw.web_server ||
          raw.server
      ) ||
      (technologies.length
        ? technologies.join(" / ")
        : null),

    method:
      normalizeString(raw.method),

    technologies,

    cpe:
      Array.isArray(raw.cpe)
        ? raw.cpe.filter(
            (item): item is Record<string, unknown> =>
              Boolean(
                item &&
                typeof item === "object" &&
                !Array.isArray(item)
              )
          )
        : [],

    responseTime:
      normalizeString(
        raw.response_time ||
          raw.responseTime ||
          raw.time
      ),

    ip:
      normalizeString(
        raw.host_ip ||
          raw.ip
      ),

    ipv4:
      Array.isArray(raw.a)
        ? raw.a
            .map((item) => normalizeString(item))
            .filter(
              (item): item is string =>
                item !== null
            )
        : [],

    ipv6:
      Array.isArray(raw.aaaa)
        ? raw.aaaa
            .map((item) => normalizeString(item))
            .filter(
              (item): item is string =>
                item !== null
            )
        : [],

    cname:
      normalizeString(
        raw.cname
      ),

    cdn:
      normalizeString(
        raw.cdn_name ||
          raw.cdn
      ),

    probe,

    location:
      normalizeString(
        raw.location
      ),

    redirectChain:
      Array.isArray(raw.chain)
        ? raw.chain
        : Array.isArray(raw.redirect_chain)
          ? raw.redirect_chain
          : Array.isArray(raw.chain_status_codes)
            ? raw.chain_status_codes
            : [],

    responseHeaders,

    rawResponseHeaders:
      normalizeString(raw.raw_header),

    request:
      normalizeString(raw.request),

    body:
      normalizeString(raw.body),

    bodyPreview:
      normalizeString(raw.body_preview),

    responseEncoding:
      inspection === "base64"
        ? "base64"
        : inspection === "full" ||
            inspection === "body" ||
            inspection === "headers"
          ? "plain"
          : null,

    wordCount:
      normalizeNumber(raw.words),

    lineCount:
      normalizeNumber(raw.lines),

    faviconHash:
      normalizeString(raw.favicon),

    faviconMd5:
      normalizeString(raw.favicon_md5),

    faviconPath:
      normalizeString(raw.favicon_path),

    faviconUrl:
      normalizeString(raw.favicon_url),

    jarmHash:
      normalizeString(raw.jarm_hash),

    http2:
      normalizeBoolean(raw.http2),

    websocket:
      normalizeBoolean(raw.websocket),

    tls,

    raw,
  };
}

function parseJsonLines(
  stdout: string,
  target: string,
  inspection: HttpxInspection = "standard"
): HttpxResult[] {
  const results: HttpxResult[] = [];

  for (
    const line of stdout.split(/\r?\n/)
  ) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(trimmed);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        results.push(
          normalizeHttpxResult(
            parsed as Record<
              string,
              unknown
            >,
            target,
            inspection
          )
        );
      }
    } catch {
      // HTTPX may emit non-JSON diagnostic
      // output in some configurations.
    }
  }

  return results;
}

function getTimeoutSeconds(
  value: unknown
): number {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return DEFAULT_TIMEOUT_SECONDS;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      "HTTPX timeout must be at least 1 second."
    );
  }

  return Math.min(
    Math.floor(parsed),
    MAX_TIMEOUT_SECONDS
  );
}

export async function getHttpxInstallation() {
  try {
    await fs.promises.access(
      HTTPX_BINARY,
      fs.constants.X_OK
    );

    return {
      installed: true,
      binary: HTTPX_BINARY,
    };
  } catch {
    return {
      installed: false,
      binary: HTTPX_BINARY,
    };
  }
}

export async function getHttpxVersion(): Promise<string> {
  const installation =
    await getHttpxInstallation();

  if (!installation.installed) {
    throw new Error(
      `ProjectDiscovery httpx was not found at ${HTTPX_BINARY}.`
    );
  }

  const { stdout, stderr } =
    await execFileAsync(
      HTTPX_BINARY,
      ["-version"],
      {
        timeout: 10_000,
        maxBuffer: 2 * 1024 * 1024,
      }
    );

  const output =
    `${stdout}\n${stderr}`.trim();

  const match =
    output.match(
      /Current Version:\s*(v?[0-9][^\s]*)/i
    );

  return (
    match?.[1] ||
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ||
    "unknown"
  );
}

export async function getHttpxCapabilities() {
  const installation =
    await getHttpxInstallation();

  return {
    binary: HTTPX_BINARY,
    installed: installation.installed,

    version:
      installation.installed
        ? await getHttpxVersion()
        : null,

    probes: [
      "status-code",
      "content-length",
      "content-type",
      "title",
      "web-server",
      "technology-detection",
      "response-time",
      "ip",
      "cname",
      "cdn",
      "redirect-location",
      "probe-status",
    ],

    outputFormats: [
      "jsonl",
      "csv",
      "markdown",
    ],

    supports: {
      redirects: true,
      technologies: true,
      screenshots: true,
      tls: true,
      http2: true,
      http3: true,
      websocket: true,
      jarm: true,
      faviconHash: true,
      customHeaders: true,
      proxy: true,
      batchInput: true,
    },
  };
}

async function executeHttpx(
  targets: string[],
  options: HttpxProbeOptions = {}
): Promise<HttpxResult[]> {
  if (
    targets.length === 0
  ) {
    return [];
  }

  if (
    targets.length >
    MAX_BATCH_TARGETS
  ) {
    throw new Error(
      `HTTPX batch limit is ${MAX_BATCH_TARGETS} targets.`
    );
  }

  const normalizedTargets =
    targets.map(normalizeTarget);

  const timeoutSeconds =
    getTimeoutSeconds(
      options.timeoutSeconds
    );

  const args = [
    "-json",
    "-silent",
    "-status-code",
    "-content-length",
    "-content-type",
    "-title",
    "-web-server",
    "-response-time",
    "-ip",
    "-cname",
    "-cdn",
    "-location",
    "-probe",
    "-include-chain",
    "-favicon",
    "-jarm",
    "-asn",
    "-http2",
    "-websocket",
    "-tls-grab",
    "-line-count",
    "-word-count",
    "-timeout",
    String(timeoutSeconds),
  ];

  const inspection =
    options.inspection || "standard";

  if (inspection === "headers") {
    args.push(
      "-include-response-header"
    );
  } else if (inspection === "body") {
    args.push(
      "-body-preview",
      "100"
    );
  } else if (inspection === "full") {
    args.push(
      "-include-response"
    );
  } else if (inspection === "base64") {
    args.push(
      "-include-response-base64"
    );
  }

  if (
    options.techDetect !== false
  ) {
    args.push(
      "-tech-detect"
    );
  }

  if (
    options.followRedirects === true
  ) {
    args.push(
      "-follow-redirects"
    );
  }

  let stdinData: string | undefined;

  if (normalizedTargets.length === 1) {
    args.push(
      "-target",
      normalizedTargets[0]
    );
  } else {
    stdinData =
      normalizedTargets.join("\n") +
      "\n";
  }

  const {
    stdout,
    stderr,
  } = await spawnHttpx(
    args,
    (timeoutSeconds + 10) * 1000,
    stdinData,
  );

  const results: HttpxResult[] = [];

  const stdoutResults =
    parseJsonLines(
      stdout,
      normalizedTargets[0],
      inspection
    );

  results.push(
    ...stdoutResults
  );

  /*
   * A failed/unreachable target may produce
   * no JSON result. We intentionally don't
   * manufacture a successful-looking result.
   */

  if (
    stderr.trim() &&
    results.length === 0
  ) {
    const diagnostic =
      stderr
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-5)
        .join(" ");

    if (
      /error|fatal|failed/i.test(
        diagnostic
      )
    ) {
      throw new Error(
        `HTTPX probe failed: ${diagnostic}`
      );
    }
  }

  return results;
}

export async function runHttpxProbe(
  target: string,
  options: HttpxProbeOptions = {}
): Promise<HttpxResult[]> {
  return runHttpxBatch(
    [target],
    options
  );
}

export async function runHttpxBatch(
  targets: string[],
  options: HttpxProbeOptions = {}
): Promise<HttpxResult[]> {
  if (!Array.isArray(targets)) {
    throw new Error(
      "HTTPX targets must be an array."
    );
  }

  if (
    targets.length === 0
  ) {
    throw new Error(
      "At least one HTTPX target is required."
    );
  }

  if (
    targets.length >
    MAX_BATCH_TARGETS
  ) {
    throw new Error(
      `HTTPX batch limit is ${MAX_BATCH_TARGETS} targets.`
    );
  }

  const results =
    await executeHttpx(
      targets,
      options
    );

  if (results.length > 0) {
    const state = loadState();

    state.results = [
      ...results,
      ...state.results,
    ].slice(0, MAX_RESULTS);

    saveState(state);
  }

  return results;
}

export function listHttpxResults(
  limit = 100
): HttpxResult[] {
  const state = loadState();

  const safeLimit = Math.min(
    Math.max(
      Number.isFinite(limit)
        ? Math.floor(limit)
        : 100,
      1
    ),
    MAX_RESULTS
  );

  return state.results.slice(
    0,
    safeLimit
  );
}

export function clearHttpxResults(): void {
  saveState({
    results: [],
  });
}
