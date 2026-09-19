import crypto from "node:crypto";

export interface DefectDojoConfig {
  baseUrl: string;
  apiToken: string;
  timeoutMs: number;
}

export interface DefectDojoStatus {
  configured: boolean;
  reachable: boolean;
  baseUrl?: string;
  authenticated?: boolean;
  message: string;
}

export interface DefectDojoProduct {
  id: number;
  name: string;
  description?: string;
  prod_type?: number;
  prod_type_name?: string;
  created?: string;
  updated?: string;
}

export interface DefectDojoEngagement {
  id: number;
  name: string;
  description?: string;
  product?: number;
  product_name?: string;
  target_start?: string;
  target_end?: string;
  status?: string;
  created?: string;
  updated?: string;
}

export interface DefectDojoFinding {
  id: number;
  title?: string;
  severity?: string;
  active?: boolean;
  verified?: boolean;
  false_p?: boolean;
  duplicate?: boolean;
  status?: string;
  date?: string;
  discovered_on?: string;
  description?: string;
  mitigation?: string;
  numerical_severity?: number;
  product?: number;
  product_name?: string;
  engagement?: number;
  engagement_name?: string;
  test?: number;
  test_name?: string;
  [key: string]: unknown;
}

interface DefectDojoListResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

function getConfig(): DefectDojoConfig | null {
  const baseUrl = process.env.DEFECTDOJO_URL?.trim().replace(/\/+$/, "");
  const apiToken = process.env.DEFECTDOJO_API_TOKEN?.trim();

  if (!baseUrl || !apiToken) {
    return null;
  }

  return {
    baseUrl,
    apiToken,
    timeoutMs: Number(process.env.DEFECTDOJO_TIMEOUT_MS || 15000),
  };
}

function buildUrl(baseUrl: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function requestDefectDojo<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const config = getConfig();

  if (!config) {
    throw new Error(
      "DefectDojo is not configured. Set DEFECTDOJO_URL and DEFECTDOJO_API_TOKEN."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.timeoutMs
  );

  try {
    const headers = new Headers(init.headers);

    headers.set("Authorization", `Token ${config.apiToken}`);
    headers.set("Accept", "application/json");

    if (
      init.body &&
      !headers.has("Content-Type") &&
      !(init.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(buildUrl(config.baseUrl, path), {
      ...init,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();

    let body: unknown = rawBody;

    if (contentType.includes("application/json") && rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }
    }

    if (!response.ok) {
      const detail =
        typeof body === "string"
          ? body.slice(0, 500)
          : JSON.stringify(body).slice(0, 500);

      throw new Error(
        `DefectDojo API ${response.status} ${response.statusText}: ${detail}`
      );
    }

    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function isDefectDojoConfigured(): boolean {
  return getConfig() !== null;
}

export function getDefectDojoBaseUrl(): string | undefined {
  return getConfig()?.baseUrl;
}

export async function getDefectDojoStatus(): Promise<DefectDojoStatus> {
  const config = getConfig();

  if (!config) {
    return {
      configured: false,
      reachable: false,
      authenticated: false,
      message:
        "DefectDojo is not configured. Set DEFECTDOJO_URL and DEFECTDOJO_API_TOKEN.",
    };
  }

  try {
    await requestDefectDojo<unknown>("/api/v2/users/?limit=1");

    return {
      configured: true,
      reachable: true,
      authenticated: true,
      baseUrl: config.baseUrl,
      message: "DefectDojo connection is healthy.",
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      authenticated: false,
      baseUrl: config.baseUrl,
      message:
        error instanceof Error
          ? error.message
          : "Unable to connect to DefectDojo.",
    };
  }
}

export async function listDefectDojoProducts(
  limit = 100
): Promise<DefectDojoProduct[]> {
  const response =
    await requestDefectDojo<DefectDojoListResponse<DefectDojoProduct>>(
      `/api/v2/products/?limit=${Math.min(Math.max(limit, 1), 1000)}`
    );

  return response.results || [];
}

export async function listDefectDojoEngagements(
  limit = 100
): Promise<DefectDojoEngagement[]> {
  const response =
    await requestDefectDojo<DefectDojoListResponse<DefectDojoEngagement>>(
      `/api/v2/engagements/?limit=${Math.min(Math.max(limit, 1), 1000)}`
    );

  return response.results || [];
}

export async function listDefectDojoFindings(
  limit = 100
): Promise<DefectDojoFinding[]> {
  const response =
    await requestDefectDojo<DefectDojoListResponse<DefectDojoFinding>>(
      `/api/v2/findings/?limit=${Math.min(Math.max(limit, 1), 1000)}`
    );

  return response.results || [];
}

export async function hasDefectDojoFinding(
  uniqueIdFromTool: string
): Promise<boolean> {
  const response =
    await requestDefectDojo<DefectDojoListResponse<DefectDojoFinding>>(
      `/api/v2/findings/?unique_id_from_tool=${encodeURIComponent(
        uniqueIdFromTool
      )}&limit=1`
    );

  return Number(response.count || 0) > 0;
}

export async function getDefectDojoFinding(
  findingId: number
): Promise<DefectDojoFinding> {
  return requestDefectDojo<DefectDojoFinding>(
    `/api/v2/findings/${encodeURIComponent(String(findingId))}/`
  );
}

export function createDefectDojoCorrelationId(): string {
  return `cyberlab-${crypto.randomUUID()}`;
}

export interface DefectDojoSyncFinding {
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  description: string;
  mitigation?: string;
  impact?: string;
  references?: string;
  date?: string;
  cvssv3_score?: number;
  unique_id_from_tool?: string;
  service?: string;
  active?: boolean;
  verified?: boolean;
}

export interface DefectDojoSyncInput {
  productName: string;
  engagementName: string;
  testTitle: string;
  scanType?: string;
  target?: string;
  scanId?: string;
  generatedAt?: string;
  findings: DefectDojoSyncFinding[];
}

export interface DefectDojoSyncResult {
  success: boolean;
  productId?: number;
  engagementId?: number;
  testId?: number;
  findingCount: number;
  importedFindings?: number;
  message: string;
  rawResponse?: unknown;
}

function normalizeDefectDojoSeverity(
  severity: string
): DefectDojoSyncFinding["severity"] {
  switch (severity.toLowerCase()) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Info";
  }
}

function extractNumericId(
  value: unknown
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return undefined;
}

export async function importCyberLabFindingsToDefectDojo(
  input: DefectDojoSyncInput
): Promise<DefectDojoSyncResult> {
  const findings = Array.isArray(input.findings)
    ? input.findings
    : [];

  /*
   * Prevent duplicate CyberLab findings from being imported into
   * DefectDojo when the same scan is synchronized more than once.
   *
   * CyberLab supplies a stable unique_id_from_tool for each finding.
   * Query DefectDojo by that exact identifier instead of downloading
   * the entire findings collection.
   */
  const duplicateChecks = await Promise.all(
    findings.map(async (finding) => {
      if (!finding.unique_id_from_tool) {
        return false;
      }

      return hasDefectDojoFinding(
        finding.unique_id_from_tool
      );
    })
  );

  const newFindings = findings.filter(
    (_, index) => !duplicateChecks[index]
  );

  const skippedDuplicateCount =
    findings.length - newFindings.length;

  if (newFindings.length === 0) {
    return {
      success: true,
      findingCount: findings.length,
      importedFindings: 0,
      message:
        findings.length > 0
          ? `CyberLab skipped ${skippedDuplicateCount} existing finding(s); no new findings required synchronization.`
          : "CyberLab created the DefectDojo scan context with no findings.",
    };
  }

  const genericReport = {
    name: input.testTitle,
    type: "CyberLab Network Scan",
    findings: newFindings,
  };

  const form = new FormData();

  form.append(
    "scan_type",
    input.scanType || "Generic Findings Import"
  );
  form.append("product_type_name", "CyberLab");
  form.append("product_name", input.productName);
  form.append("engagement_name", input.engagementName);
  form.append("test_title", input.testTitle);
  form.append("auto_create_context", "true");
  form.append("active", "true");
  form.append("verified", "false");
  form.append("minimum_severity", "Info");
  form.append("close_old_findings", "false");

  if (input.target) {
    form.append(
      "tags",
      `cyberlab,target:${input.target}`
    );
  }

  if (input.scanId) {
    form.append("build_id", input.scanId);
  }

  const reportBlob = new Blob(
    [JSON.stringify(genericReport)],
    { type: "application/json" }
  );

  form.append(
    "file",
    reportBlob,
    "cyberlab-findings.json"
  );

  const response = await requestDefectDojo<unknown>(
    "/api/v2/import-scan/",
    {
      method: "POST",
      body: form,
    }
  );

  const responseObject =
    response &&
    typeof response === "object"
      ? response as Record<string, unknown>
      : {};

  const testObject =
    responseObject.test &&
    typeof responseObject.test === "object"
      ? responseObject.test as Record<string, unknown>
      : {};

  const engagementObject =
    responseObject.engagement &&
    typeof responseObject.engagement === "object"
      ? responseObject.engagement as Record<string, unknown>
      : {};

  const productObject =
    responseObject.product &&
    typeof responseObject.product === "object"
      ? responseObject.product as Record<string, unknown>
      : {};

  const productId =
    extractNumericId(responseObject.product) ??
    extractNumericId(responseObject.product_id) ??
    extractNumericId(productObject.id);

  const engagementId =
    extractNumericId(responseObject.engagement) ??
    extractNumericId(responseObject.engagement_id) ??
    extractNumericId(engagementObject.id);

  const testId =
    extractNumericId(responseObject.test) ??
    extractNumericId(responseObject.test_id) ??
    extractNumericId(testObject.id);

  const importedCount =
    extractNumericId(responseObject.finding_count) ??
    extractNumericId(responseObject.findings_count) ??
    newFindings.length;

  return {
    success: true,
    productId,
    engagementId,
    testId,
    findingCount: findings.length,
    importedFindings: importedCount,
    message:
      skippedDuplicateCount > 0
        ? `CyberLab imported ${newFindings.length} new finding(s) and skipped ${skippedDuplicateCount} existing finding(s).`
        : `CyberLab imported ${newFindings.length} finding(s) into DefectDojo.`,
    rawResponse: response,
  };
}

export { normalizeDefectDojoSeverity };
