import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ShieldCheck,
  Activity,
  Globe,
  Server,
  Network,
  BarChart3,
  Radar,
  ExternalLink,
  Settings,
  CheckCircle2,
  CircleOff,
} from "lucide-react";

interface SecurityArsenalProps {
  onLaunch: (url: string) => void;
}

interface IntegrationStatus {
  id: string;
  name: string;
  url: string;
  status: "online" | "offline" | "not-configured";
  responseTimeMs: number | null;
  message: string;
  checkedAt: string;
}

interface IntegrationStatusResponse {
  timestamp: string;
  integrations: IntegrationStatus[];
}

interface GreenboneTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  reportId: string | null;
}

interface GreenboneScanner {
  id: string;
  name: string;
  type: number | null;
}

interface GreenboneConfig {
  id: string;
  name: string;
  usageType: string;
}

interface GreenboneTasksResponse {
  statusCode: number;
  statusText: string;
  xml: string;
  timestamp: string;
}

interface GreenboneFinding {
  id: string;
  name: string;
  severity: string;
  severityScore: number | null;
  host: string;
  port: string;
  description: string;
  solution: string;
  result: string;
  oid: string;
}

interface GreenboneReportSummary {
  reportId: string;
  taskName: string;
  scanStatus: string;
  hostCount: number;
  resultCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  logCount: number;
  falsePositiveCount: number;
  severity: number;
  scanStart: string | null;
  scanEnd: string | null;
  errors: string[];
  findings: GreenboneFinding[];
}

interface SecurityTool {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
  status: "ready" | "offline" | "external" | "online" | "not-configured";
  icon: React.ElementType;
}

const tools: SecurityTool[] = [
  {
    id: "greenbone",
    name: "Greenbone / OpenVAS",
    category: "VULNERABILITY MANAGEMENT",
    description:
      "Network vulnerability assessment, CVE discovery, risk scoring and vulnerability management.",
    url: "https://45.222.128.34:9392",
    status: "ready",
    icon: ShieldCheck,
  },
  {
    id: "observium",
    name: "Observium",
    category: "NETWORK MONITORING",
    description:
      "Infrastructure monitoring for network devices, interfaces, traffic, sensors and system health.",
    url: "http://45.222.128.31/observium",
    status: "ready",
    icon: Activity,
  },
  {
    id: "burp",
    name: "Burp Suite",
    category: "WEB APPLICATION SECURITY",
    description:
      "Professional web application security testing with Proxy, Repeater, Intruder and Scanner.",
    url: "",
    status: "external",
    icon: Globe,
  },
  {
    id: "wazuh",
    name: "Wazuh",
    category: "SIEM / XDR",
    description:
      "Security monitoring, endpoint detection, file integrity monitoring, vulnerability detection and threat hunting.",
    url: "https://127.0.0.1:443",
    status: "offline",
    icon: Server,
  },
  {
    id: "zeek",
    name: "Zeek",
    category: "NETWORK SECURITY MONITORING",
    description:
      "Passive network visibility, protocol analysis and high-fidelity network security logging.",
    url: "",
    status: "external",
    icon: Network,
  },
  {
    id: "suricata",
    name: "Suricata",
    category: "IDS / IPS",
    description:
      "Network intrusion detection, intrusion prevention and deep packet inspection.",
    url: "",
    status: "external",
    icon: Radar,
  },
  {
    id: "grafana",
    name: "Grafana",
    category: "SECURITY VISUALIZATION",
    description:
      "Interactive dashboards for security events, infrastructure metrics, logs and operational telemetry.",
    url: "http://127.0.0.1:3000",
    status: "offline",
    icon: BarChart3,
  },
];

const statusConfig = {
  ready: {
    label: "READY",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: CheckCircle2,
  },
    online: {
    label: "ONLINE",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: CheckCircle2,
  },
  offline: {
    label: "NOT CONNECTED",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-400",
    icon: CircleOff,
  },
  external: {
    label: "EXTERNAL TOOL",
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-400",
    icon: ExternalLink,
  },
};


export const SecurityArsenal: React.FC<SecurityArsenalProps> = ({
  onLaunch,
}) => {
    const [integrationStatuses, setIntegrationStatuses] =
    useState<Record<string, IntegrationStatus>>({});

  const [integrationLoading, setIntegrationLoading] =
    useState(true);

  const [lastRefresh, setLastRefresh] =
    useState<Date | null>(null);
    const [greenboneTasks, setGreenboneTasks] =
  useState<GreenboneTask[]>([]);

const [greenboneLoading, setGreenboneLoading] =
  useState(false);

const [greenboneError, setGreenboneError] =
  useState<string | null>(null);

  const [selectedGreenboneReport, setSelectedGreenboneReport] =
  useState<string | null>(null);

  const [greenboneReportModalOpen, setGreenboneReportModalOpen] =
  useState(false);

const [greenboneReportXml, setGreenboneReportXml] =
  useState<string | null>(null);

    const [greenboneReportSummary, setGreenboneReportSummary] =
    useState<GreenboneReportSummary | null>(null);

const [greenboneReportLoading, setGreenboneReportLoading] =
  useState(false);

const [greenboneReportError, setGreenboneReportError] =
  useState<string | null>(null);
 
  const [greenboneScanName, setGreenboneScanName] =
    useState("");

  const [greenboneTargetType, setGreenboneTargetType] =
    useState<
      | "single-ip"
      | "ip-range"
      | "cidr"
      | "hostname"
      | "multiple"
    >("single-ip");

  const [greenboneTarget, setGreenboneTarget] =
    useState("");

  const [greenboneScanners, setGreenboneScanners] =
  useState<GreenboneScanner[]>([]);

const [greenboneConfigs, setGreenboneConfigs] =
  useState<GreenboneConfig[]>([]);

const [greenboneScannerId, setGreenboneScannerId] =
  useState("");

const [greenboneConfigId, setGreenboneConfigId] =
  useState("");

const [greenboneProfilesLoading, setGreenboneProfilesLoading] =
  useState(false);

const [greenboneProfilesError, setGreenboneProfilesError] =
  useState<string | null>(null);

  const [greenboneScanStarting, setGreenboneScanStarting] =
    useState(false);

  const [greenboneScanStartError, setGreenboneScanStartError] =
    useState<string | null>(null);

  const [greenboneScanSuccess, setGreenboneScanSuccess] =
    useState<{
      name: string;
      target: string;
      targetId: string;
      taskId: string;
      reportId: string | null;
    } | null>(null);  

const loadGreenboneProfiles = useCallback(async () => {
  setGreenboneProfilesLoading(true);
  setGreenboneProfilesError(null);

  try {
    const [scannersResponse, configsResponse] =
      await Promise.all([
        fetch("/api/integrations/greenbone/scanners"),
        fetch("/api/integrations/greenbone/configs"),
      ]);

    const scannersData = await scannersResponse.json();
    const configsData = await configsResponse.json();

    if (!scannersResponse.ok) {
      throw new Error(
        scannersData?.error ||
          "Failed to retrieve Greenbone scanners."
      );
    }

    if (!configsResponse.ok) {
      throw new Error(
        configsData?.error ||
          "Failed to retrieve Greenbone scan configurations."
      );
    }

    const parser = new DOMParser();

    const scannersDocument = parser.parseFromString(
      `<root>${scannersData.xml || ""}</root>`,
      "application/xml"
    );

    const scannerNodes = Array.from(
      scannersDocument.querySelectorAll("scanner")
    );

    const discoveredScanners: GreenboneScanner[] =
      scannerNodes
        .map((scanner) => ({
          id: scanner.getAttribute("id") || "",
          name:
            scanner.querySelector(":scope > name")?.textContent?.trim() ||
            "",
          type: Number(
            scanner.querySelector(":scope > type")?.textContent || ""
          ),
        }))
        .filter(
          (scanner) =>
            scanner.id &&
            scanner.name
        );

    const configsDocument = parser.parseFromString(
      `<root>${configsData.xml || ""}</root>`,
      "application/xml"
    );

    const configNodes = Array.from(
      configsDocument.querySelectorAll("config")
    );

    const discoveredConfigs: GreenboneConfig[] =
      configNodes
        .map((config) => ({
          id: config.getAttribute("id") || "",
          name:
            config.querySelector(":scope > name")?.textContent?.trim() ||
            "",
          usageType:
            config.querySelector(":scope > usage_type")?.textContent?.trim() ||
            "",
        }))
        .filter(
          (config) =>
            config.id &&
            config.name &&
            config.usageType === "scan"
        );

    setGreenboneScanners(discoveredScanners);
    setGreenboneConfigs(discoveredConfigs);

    setGreenboneScannerId((currentId) => {
      if (
        currentId &&
        discoveredScanners.some(
          (scanner) => scanner.id === currentId
        )
      ) {
        return currentId;
      }

      const preferredScanner =
        discoveredScanners.find(
          (scanner) =>
            scanner.name.toLowerCase() ===
            "openvas default"
        ) ||
        discoveredScanners.find(
          (scanner) =>
            scanner.name.toLowerCase().includes("openvas")
        ) ||
        discoveredScanners[0];

      return preferredScanner?.id || "";
    });

    setGreenboneConfigId((currentId) => {
      if (
        currentId &&
        discoveredConfigs.some(
          (config) => config.id === currentId
        )
      ) {
        return currentId;
      }

      const preferredConfig =
        discoveredConfigs.find(
          (config) =>
            config.name.toLowerCase() ===
              "full and fast"
        ) ||
        discoveredConfigs.find(
          (config) =>
            config.name.toLowerCase().includes("full")
        ) ||
        discoveredConfigs[0];

      return preferredConfig?.id || "";
    });
  } catch (error) {
    console.error(
      "Failed to load Greenbone scanners/configurations:",
      error
    );

    setGreenboneProfilesError(
      error instanceof Error
        ? error.message
        : "Failed to load Greenbone scan profiles."
    );
  } finally {
    setGreenboneProfilesLoading(false);
  }
}, []);

  const loadIntegrationStatuses = useCallback(async () => {
    try {
      setIntegrationLoading(true);

      const response = await fetch(
        "/api/integrations/status"
      );

      if (!response.ok) {
        throw new Error(
          `Integration status request failed: ${response.status}`
        );
      }

      const data =
        (await response.json()) as IntegrationStatusResponse;

      const statusMap =
        data.integrations.reduce(
          (
            map: Record<string, IntegrationStatus>,
            integration
          ) => {
            map[integration.id] = integration;
            return map;
          },
          {}
        );

      setIntegrationStatuses(statusMap);
      setLastRefresh(new Date());
    } catch (error) {
      console.error(
        "Failed to load Security Arsenal integration status:",
        error
      );
    } finally {
      setIntegrationLoading(false);
    }
  }, []);
  const loadGreenboneTasks = useCallback(async () => {
    try {
      setGreenboneLoading(true);
      setGreenboneError(null);

      const response = await fetch(
        "/api/integrations/greenbone/tasks"
      );

      if (!response.ok) {
        throw new Error(
          `Greenbone task request failed: ${response.status}`
        );
      }

      const data =
        (await response.json()) as GreenboneTasksResponse;
      const parser = new DOMParser();
const xmlDocument = parser.parseFromString(
  `<root>${data.xml}</root>`,
  "application/xml"
);

      const taskNodes =
        Array.from(
          xmlDocument.querySelectorAll(
            "get_tasks_response > task"
          )
        );

     const parsedTasks =
  taskNodes.map((taskNode) => {
    const reportNode =
      taskNode.querySelector(
        "last_report > report"
      ) ||
      taskNode.querySelector(
        "current_report > report"
      );

   const progressText =
  taskNode.querySelector(
    "progress"
  )?.textContent || "0";

const rawProgress =
  Number.parseInt(
    progressText,
    10
  );

const taskStatus =
  taskNode.querySelector(
    ":scope > status"
  )?.textContent ||
  "Unknown";

const progress =
  taskStatus.toLowerCase() === "done" &&
  rawProgress < 0
    ? 100
    : Number.isNaN(rawProgress)
      ? 0
      : rawProgress;

return {
  id:
    taskNode.getAttribute("id") ||
    "",
  name:
    taskNode.querySelector(
      ":scope > name"
    )?.textContent ||
    "Unnamed task",
  status:
    taskNode.querySelector(
      ":scope > status"
    )?.textContent ||
    "Unknown",
  progress:
    progress,
  reportId:
    reportNode?.getAttribute(
      "id"
    ) || null,
};

          return {
            id:
              taskNode.getAttribute("id") ||
              "",
            name:
              taskNode.querySelector(
                ":scope > name"
              )?.textContent ||
              "Unnamed task",
            status:
              taskNode.querySelector(
                ":scope > status"
              )?.textContent ||
              "Unknown",
            progress:
              Number.isNaN(progress)
                ? 0
                : progress,
            reportId:
              reportNode?.getAttribute(
                "id"
              ) || null,
          };
        });

        console.log(
        "GREENBONE PARSED TASKS:",
        parsedTasks
      );  

      setGreenboneTasks(parsedTasks);
    } catch (error) {
      console.error(
        "Failed to load Greenbone tasks:",
        error
      );

      setGreenboneError(
        error instanceof Error
          ? error.message
          : "Failed to load Greenbone tasks."
      );
    } finally {
      setGreenboneLoading(false);
    }
    }, []);

  const startGreenboneScan = useCallback(async () => {
    const target = greenboneTarget.trim();

    if (!target) {
      setGreenboneScanStartError(
        "Please enter a Greenbone scan target."
      );
      return;
    }
if (!greenboneScannerId) {
  setGreenboneScanStartError(
    "Greenbone scanner information is still loading."
  );
  return;
}

if (!greenboneConfigId) {
  setGreenboneScanStartError(
    "Greenbone scan configuration information is still loading."
  );
  return;
}
    setGreenboneScanStarting(true);
    setGreenboneScanStartError(null);
    setGreenboneScanSuccess(null);

    try {
      const response = await fetch(
        "/api/integrations/greenbone/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name:
              greenboneScanName.trim() ||
              `CyberLab Greenbone Scan - ${target}`,
            target,
           configId: greenboneConfigId,
scannerId: greenboneScannerId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Greenbone scan request failed: ${response.status}`
        );
      }

      if (!data?.scan?.taskId) {
        throw new Error(
          "Greenbone started the scan but no task ID was returned."
        );
      }

      setGreenboneScanSuccess({
        name: data.scan.name,
        target: data.scan.target,
        targetId: data.scan.targetId,
        taskId: data.scan.taskId,
        reportId: data.scan.reportId || null,
      });

      setGreenboneScanName("");
      setGreenboneTarget("");

      await loadGreenboneTasks();
    } catch (error) {
      console.error(
        "Failed to start Greenbone scan:",
        error
      );

      setGreenboneScanStartError(
        error instanceof Error
          ? error.message
          : "Failed to start Greenbone scan."
      );
    } finally {
      setGreenboneScanStarting(false);
    }
  }, [
  greenboneTarget,
  greenboneScanName,
  greenboneConfigId,
  greenboneScannerId,
  loadGreenboneTasks,
]);
 
 
const parseGreenboneReport = (
  reportId: string,
  xml: string
): GreenboneReportSummary => {
  const parser = new DOMParser();

  const xmlDocument = parser.parseFromString(
    `<root>${xml}</root>`,
    "application/xml"
  );

  const reportNode =
    xmlDocument.querySelector(
      "get_reports_response > report > report"
    );

  if (!reportNode) {
    throw new Error(
      "Greenbone report data could not be parsed."
    );
  }

  const getText = (selector: string) =>
    reportNode.querySelector(selector)?.textContent?.trim() ||
    "";

  const getNumber = (
    selector: string,
    fallback = 0
  ) => {
    const value = Number.parseFloat(
      getText(selector)
    );

    return Number.isNaN(value)
      ? fallback
      : value;
  };

  const errors = Array.from(
    reportNode.querySelectorAll(
      ":scope > errors > error > description"
    )
  )
    .map(
      (node) =>
        node.textContent?.trim() || ""
    )
    .filter(Boolean);

  const findings: GreenboneFinding[] =
    Array.from(
      reportNode.querySelectorAll(
        ":scope > results > result"
      )
    ).map((resultNode, index) => {
      const getResultText = (
        selector: string
      ) =>
        resultNode.querySelector(selector)
          ?.textContent?.trim() || "";

      const severityText =
        getResultText(":scope > severity");

      const severityScore =
        Number.parseFloat(severityText);

      const hostNode =
        resultNode.querySelector(
          ":scope > host"
        );

      const host =
        hostNode?.childNodes[0]?.textContent?.trim() ||
        hostNode?.textContent?.trim() ||
        "Unknown host";

      const hostname =
        hostNode?.querySelector(
          ":scope > hostname"
        )?.textContent?.trim() || "";

      const port =
        getResultText(":scope > port") ||
        "—";

      const nvtNode =
        resultNode.querySelector(
          ":scope > nvt"
        );

      const oid =
        nvtNode?.getAttribute("oid") ||
        "";

      const description =
        getResultText(
          ":scope > description"
        ) ||
        "No description provided.";

      const solution =
        getResultText(
          ":scope > nvt > solution"
        ) ||
        "No remediation information provided.";

      return {
        id:
          resultNode.getAttribute("id") ||
          `${reportId}-finding-${index}`,

        name:
          getResultText(
            ":scope > name"
          ) ||
          "Unnamed vulnerability",

        severity:
          getResultText(
            ":scope > threat"
          ) ||
          "Unknown",

        severityScore:
          Number.isNaN(severityScore)
            ? null
            : severityScore,

        host:
          hostname
            ? `${host} (${hostname})`
            : host,

        port,

        description,

        solution,

        result:
          getResultText(
            ":scope > original_threat"
          ) || "",

        oid,
      };
    });

  return {
    reportId,

    taskName:
      getText(":scope > task > name") ||
      "Unnamed task",

    scanStatus:
      getText(":scope > scan_run_status") ||
      "Unknown",

    hostCount: getNumber(
      ":scope > hosts > count"
    ),

    resultCount: getNumber(
      ":scope > result_count > full"
    ),

    criticalCount: getNumber(
      ":scope > result_count > critical > full"
    ),

    highCount: getNumber(
      ":scope > result_count > high > full"
    ),

    mediumCount: getNumber(
      ":scope > result_count > medium > full"
    ),

    lowCount: getNumber(
      ":scope > result_count > low > full"
    ),

    logCount: getNumber(
      ":scope > result_count > log > full"
    ),

    falsePositiveCount: getNumber(
      ":scope > result_count > false_positive > full"
    ),

    severity: getNumber(
      ":scope > severity > full"
    ),

    scanStart:
      getText(":scope > scan_start") ||
      null,

    scanEnd:
      getText(":scope > scan_end") ||
      null,

    errors,

    findings,
  };
};

  
const loadGreenboneReport = useCallback(
  async (reportId: string) => {
    try {
     setSelectedGreenboneReport(reportId);
     setGreenboneReportModalOpen(true);
     setGreenboneReportLoading(true);
     setGreenboneReportError(null);
     setGreenboneReportSummary(null);
     setGreenboneReportXml(null); 

      const response = await fetch(
        `/api/integrations/greenbone/reports/${reportId}`
      );

      if (!response.ok) {
        throw new Error(
          `Greenbone report request failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.xml) {
        throw new Error(
          "Greenbone returned an empty report."
        );
      }

      const summary = parseGreenboneReport(
        reportId,
        data.xml
      );

      setGreenboneReportSummary(summary);
      setGreenboneReportXml(data.xml);
    } catch (error) {
      console.error(
        "Failed to load Greenbone report:",
        error
      );

      setGreenboneReportError(
        error instanceof Error
          ? error.message
          : "Failed to load Greenbone report."
      );
    } finally {
      setGreenboneReportLoading(false);
    }
  },
  []
);

 
 useEffect(() => {
  loadIntegrationStatuses();
  loadGreenboneProfiles();
  loadGreenboneTasks();

  const interval = window.setInterval(() => {
    loadIntegrationStatuses();
    loadGreenboneProfiles();
    loadGreenboneTasks();
  }, 30000);

  return () => {
    window.clearInterval(interval);
  };
}, [
  loadIntegrationStatuses,
  loadGreenboneProfiles,
  loadGreenboneTasks,
]);

  const formatCheckedAt = (
    value: string | undefined
  ) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }; 
  const handleLaunch = (tool: SecurityTool) => {
    if (!tool.url) {
      alert(
        `${tool.name} is a local/external security application. Launch it from the Kali desktop environment.`
      );
      return;
    }

    onLaunch(tool.url);
  };

 return (
  <section className="space-y-5">

    {/* Header */}
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-start gap-4">
           <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-lg font-bold uppercase tracking-widest text-white">
                Security Arsenal
              </h2>

              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                CYBERLAB BRANCHES
              </span>
            </div>

            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              Central launch and integration point for third-party
              cybersecurity platforms operating alongside Kali CyberLab.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Arsenal Status
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-mono text-xs font-bold text-emerald-400">
                CENTRAL HUB ONLINE
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={loadIntegrationStatuses}
            disabled={integrationLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Activity
              className={`h-3.5 w-3.5 ${
                integrationLoading ? "animate-spin" : ""
              }`}
            />

            {integrationLoading
              ? "CHECKING..."
              : "REFRESH STATUS"}
          </button>
        </div>

      </div>

      {lastRefresh && (
        <div className="mt-3 border-t border-slate-800 pt-3 text-right font-mono text-[8px] uppercase tracking-wider text-slate-600">
          Last dashboard refresh: {formatCheckedAt(lastRefresh.toISOString())}
        </div>
      )}
    </div>

    {/* Architecture Banner */}
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Network className="h-4 w-4 text-emerald-400" />

        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          CYBERLAB ARCHITECTURE
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center">

        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-center">
          <div className="text-xs font-bold text-emerald-400">
            KALI CYBERLAB
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">
            CENTRAL COMMAND
          </div>
        </div>

        <div className="hidden h-px w-12 bg-slate-700 md:block" />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            "Vulnerability",
            "Monitoring",
            "SIEM / XDR",
            "Network Defense",
          ].map((branch) => (
            <div
              key={branch}
              className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-center"
            >
              <div className="text-[9px] font-bold uppercase text-slate-400">
                {branch}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>

    {/* Tool Grid */}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

      {tools.map((tool) => {
        const Icon = tool.icon;

        const integration =
          integrationStatuses[tool.id];

        const effectiveStatus =
          integration?.status === "online"
            ? "online"
            : integration?.status === "offline"
              ? "offline"
              : integration?.status === "not-configured"
                ? "not-configured"
                : tool.status;

        const status = statusConfig[effectiveStatus];
        const StatusIcon = status.icon;

        return (
          <article
            key={tool.id}
            className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl"
          >

            {/* Tool Header */}
            <div className="flex items-start justify-between gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>

              <div
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${status.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </div>

            </div>

            {/* Tool Information */}
            <div className="mt-4 flex-1">

              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                {tool.category}
              </div>

              <h3 className="mt-1 font-mono text-base font-bold text-white">
                {tool.name}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {tool.description}
              </p>

            </div>

            {/* Endpoint */}
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                ENDPOINT
              </div>

              <div className="mt-1 truncate font-mono text-[10px] text-slate-400">
                {tool.url || "KALI DESKTOP APPLICATION"}
              </div>
            </div>

            {/* Live Health */}
            {integration && (
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">

                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    LIVE HEALTH
                  </div>

                  {integrationLoading && (
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-sky-400">
                      CHECKING...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">

                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                      Response
                    </div>

                    <div className="mt-1 font-mono text-[10px] font-bold text-slate-300">
                      {integration.responseTimeMs !== null
                        ? `${integration.responseTimeMs} ms`
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                      HTTP
                    </div>

                    <div className="mt-1 font-mono text-[10px] font-bold text-slate-300">
                      {integration.message.match(/HTTP \d+/)?.[0] || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                      Checked
                    </div>

                    <div className="mt-1 font-mono text-[10px] font-bold text-slate-300">
                      {formatCheckedAt(integration.checkedAt)}
                    </div>
                  </div>

                </div>

                <div className="mt-2 border-t border-slate-800 pt-2 font-mono text-[8px] text-slate-500">
                  {integration.message}
                </div>

              </div>
            )}

            {/* Actions */}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">

              <button
                onClick={() => handleLaunch(tool)}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {tool.url ? "Open Dashboard" : "Launch Tool"}
              </button>

              <button
                onClick={() =>
                  alert(
                    `${tool.name} integration settings will be added during the integration phase.`
                  )
                }
                className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
                title={`Configure ${tool.name}`}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>

            </div>

          </article>
        );
      })}

    </div>

               {/* Greenbone Master Card */}
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/70 p-5 shadow-lg shadow-emerald-950/10">
          <div className="mb-5 flex items-center gap-2 border-b border-emerald-500/10 pb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                GREENBONE / OPENVAS
              </div>
              <div className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-600">
                VULNERABILITY MANAGEMENT ENGINE
              </div>
            </div>
            <span className="ml-auto rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
              LIVE GMP
            </span>
          </div>

          {/* New Greenbone Scan */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />

                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  NEW GREENBONE SCAN
                </span>

                <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-400">
                  GMP
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Create and start a vulnerability assessment directly through Greenbone / OpenVAS.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Scan Name
              </label>

              <input
                type="text"
                value={greenboneScanName}
                onChange={(event) =>
                  setGreenboneScanName(event.target.value)
                }
                placeholder="e.g. Production Server Scan"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10px] text-white outline-none transition focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Target Type
              </label>

              <select
                value={greenboneTargetType}
                onChange={(event) =>
                  setGreenboneTargetType(
                    event.target.value as
                      | "single-ip"
                      | "ip-range"
                      | "cidr"
                      | "hostname"
                      | "multiple"
                  )
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10px] text-white outline-none transition focus:border-emerald-500/50"
              >
                <option value="single-ip">Single IP</option>
                <option value="ip-range">IP Range</option>
                <option value="cidr">CIDR / Subnet</option>
                <option value="hostname">Hostname</option>
                <option value="multiple">Multiple Targets</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Target
              </label>

              <input
                type="text"
                value={greenboneTarget}
                onChange={(event) =>
                  setGreenboneTarget(event.target.value)
                }
                placeholder={
                  greenboneTargetType === "single-ip"
                    ? "e.g. 192.168.1.10"
                    : greenboneTargetType === "ip-range"
                      ? "e.g. 192.168.1.10-192.168.1.50"
                      : greenboneTargetType === "cidr"
                        ? "e.g. 192.168.1.0/24"
                        : greenboneTargetType === "hostname"
                          ? "e.g. server.example.local"
                          : "e.g. 192.168.1.10,192.168.1.20"
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10px] text-white outline-none transition focus:border-emerald-500/50"
              />

              <p className="mt-1 font-mono text-[8px] text-slate-600">
                {greenboneTargetType === "single-ip" &&
                  "Enter one IPv4 or IPv6 address."}

                {greenboneTargetType === "ip-range" &&
                  "Enter the first and last IP address."}

                {greenboneTargetType === "cidr" &&
                  "Enter a network using CIDR notation."}

                {greenboneTargetType === "hostname" &&
                  "Enter a resolvable hostname or FQDN."}

                {greenboneTargetType === "multiple" &&
                  "Separate multiple targets with commas."}
              </p>
            </div>
<div>
  <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
    Greenbone Scanner
  </label>

  <select
    value={greenboneScannerId}
    onChange={(event) =>
      setGreenboneScannerId(event.target.value)
    }
    disabled={
      greenboneProfilesLoading ||
      greenboneScanners.length === 0
    }
    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10px] text-white outline-none transition focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {greenboneScanners.length === 0 ? (
      <option value="">
        {greenboneProfilesLoading
          ? "Loading Greenbone scanners..."
          : "No scanners available"}
      </option>
    ) : (
      greenboneScanners.map((scanner) => (
        <option
          key={scanner.id}
          value={scanner.id}
        >
          {scanner.name}
        </option>
      ))
    )}
  </select>
</div>
            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Greenbone Scan Profile
              </label>

              <select
  value={greenboneConfigId}
  onChange={(event) =>
    setGreenboneConfigId(event.target.value)
  }
  disabled={
    greenboneProfilesLoading ||
    greenboneConfigs.length === 0
  }
  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[10px] text-white outline-none transition focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
>
  {greenboneConfigs.length === 0 ? (
    <option value="">
      {greenboneProfilesLoading
        ? "Loading Greenbone profiles..."
        : "No scan profiles available"}
    </option>
  ) : (
    greenboneConfigs.map((config) => (
      <option
        key={config.id}
        value={config.id}
      >
        {config.name}
      </option>
    ))
  )}
</select>
            </div>
          </div>

          {greenboneProfilesError && (
  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-[10px] text-amber-300">
    {greenboneProfilesError}
  </div>
)}

          {greenboneScanStartError && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-red-400">
                Scan Start Error
              </div>

              <div className="mt-1 font-mono text-[9px] text-red-300">
                {greenboneScanStartError}
              </div>
            </div>
          )}

          {greenboneScanSuccess && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  SCAN STARTED SUCCESSFULLY
                </span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div>
                  <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                    TARGET
                  </div>

                  <div className="mt-1 break-all font-mono text-[9px] text-slate-300">
                    {greenboneScanSuccess.target}
                  </div>
                </div>

                <div>
                  <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                    TASK ID
                  </div>

                  <div className="mt-1 break-all font-mono text-[9px] text-slate-300">
                    {greenboneScanSuccess.taskId}
                  </div>
                </div>

                <div>
                  <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                    TARGET ID
                  </div>

                  <div className="mt-1 break-all font-mono text-[9px] text-slate-300">
                    {greenboneScanSuccess.targetId}
                  </div>
                </div>

                <div>
                  <div className="text-[7px] font-bold uppercase tracking-wider text-slate-600">
                    REPORT ID
                  </div>

                  <div className="mt-1 break-all font-mono text-[9px] text-slate-300">
                    {greenboneScanSuccess.reportId || "PENDING"}
                  </div>
                </div>
              </div>
            </div>
          )}

                <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={startGreenboneScan}
              disabled={
                greenboneScanStarting ||
                !greenboneTarget.trim()
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {greenboneScanStarting ? (
                <>
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                  STARTING SCAN...
                </>
              ) : (
                <>
                  <Radar className="h-3.5 w-3.5" />
                  START GREENBONE SCAN
                </>
              )}
            </button>
          </div>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-emerald-500/10" />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600">
            SCAN MONITOR
          </span>
          <div className="h-px flex-1 bg-emerald-500/10" />
        </div>

            {/* Greenbone Integration Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />

              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                GREENBONE / OPENVAS
              </span>

              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                LIVE GMP
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Live vulnerability-management tasks retrieved directly
              through the Greenbone GMP integration.
            </p>
          </div>

          <button
            type="button"
            onClick={loadGreenboneTasks}
            disabled={greenboneLoading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Activity
              className={`h-3.5 w-3.5 ${
                greenboneLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
            {greenboneLoading
              ? "LOADING..."
              : "REFRESH TASKS"}
          </button>
        </div>

        {greenboneError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-red-400">
              GREENBONE ERROR
            </div>

            <div className="mt-1 font-mono text-[10px] text-red-300">
              {greenboneError}
            </div>
          </div>
        )}

        {!greenboneError &&
          greenboneTasks.length === 0 &&
          !greenboneLoading && (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-5 text-center">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                NO GREENBONE TASKS
              </div>

              <div className="mt-1 text-xs text-slate-600">
                No scan tasks were returned by Greenbone.
              </div>
            </div>
          )}

        {greenboneTasks.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-800 px-3 pb-2">
              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                Task
              </div>

              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                Status
              </div>

              <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                Progress
              </div>
            </div>

            {greenboneTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[10px] font-bold text-slate-300">
                      {task.name}
                    </div>

                    <div className="mt-1 truncate font-mono text-[8px] text-slate-600">
                      TASK: {task.id}
                    </div>

                    {task.reportId && (
                      <div className="mt-1 truncate font-mono text-[8px] text-slate-600">
                        REPORT: {task.reportId}
                      </div>
                    )}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${
                        task.status.toLowerCase() ===
                        "running"
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                          : task.status.toLowerCase() ===
                            "done"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
  <div className="font-mono text-[10px] font-bold text-slate-300">
    {task.progress}%
  </div>

  {task.reportId && (
    <button
      type="button"
      onClick={() =>
        loadGreenboneReport(task.reportId!)
      }
      disabled={
        greenboneReportLoading &&
        selectedGreenboneReport === task.reportId
      }
      className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {greenboneReportLoading &&
      selectedGreenboneReport === task.reportId
        ? "LOADING..."
        : "VIEW REPORT"}
    </button>
  )}
</div>
                </div>
              </div>
            ))}
          </div>
                )}

        </div>
      </div>

      {greenboneReportModalOpen && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    onClick={() => setGreenboneReportModalOpen(false)}
  >
    <div
      className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-950 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />

            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              GREENBONE SECURITY REPORT
            </span>

            {greenboneReportSummary && (
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                {greenboneReportSummary.scanStatus}
              </span>
            )}
          </div>

          {greenboneReportSummary && (
            <>
              <div className="mt-1 truncate font-mono text-xs font-bold text-slate-300">
                {greenboneReportSummary.taskName}
              </div>

              <div className="mt-1 truncate font-mono text-[8px] text-slate-600">
                REPORT: {greenboneReportSummary.reportId}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setGreenboneReportModalOpen(false)}
          className="ml-4 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          title="Close report"
        >
          <CircleOff className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Report Area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {greenboneReportError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              GREENBONE REPORT ERROR
            </div>

            <div className="mt-2 font-mono text-[10px] leading-5 text-red-300">
              {greenboneReportError}
            </div>
          </div>
        )}

        {greenboneReportLoading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8">
            <div className="flex items-center justify-center gap-3">
              <Activity className="h-5 w-5 animate-spin text-emerald-400" />

              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                LOADING GREENBONE REPORT
              </span>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              Retrieving and parsing vulnerability-management report data.
            </p>
          </div>
        )}

        {greenboneReportSummary && !greenboneReportLoading && (
          <div
            id="greenbone-print-report"
            className="space-y-5"
          >
            {/* Report Overview */}
            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    SECURITY ASSESSMENT
                  </div>

                  <div className="mt-2 text-lg font-bold text-slate-200">
                    {greenboneReportSummary.taskName}
                  </div>

                  <div className="mt-2 font-mono text-[9px] leading-5 text-slate-500">
                    REPORT ID: {greenboneReportSummary.reportId}
                  </div>

                  <div className="font-mono text-[9px] leading-5 text-slate-500">
                    STATUS: {greenboneReportSummary.scanStatus}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-4 text-center">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    OVERALL SEVERITY
                  </div>

                  <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                    {greenboneReportSummary.severity}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div>
              <div className="mb-3 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                SCAN SUMMARY
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Hosts
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-slate-200">
                    {greenboneReportSummary.hostCount}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Results
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-slate-200">
                    {greenboneReportSummary.resultCount}
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-red-400">
                    Critical
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-red-400">
                    {greenboneReportSummary.criticalCount}
                  </div>
                </div>

                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-orange-400">
                    High
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-orange-400">
                    {greenboneReportSummary.highCount}
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-amber-400">
                    Medium
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-amber-400">
                    {greenboneReportSummary.mediumCount}
                  </div>
                </div>

                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-sky-400">
                    Low
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-sky-400">
                    {greenboneReportSummary.lowCount}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Log
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-slate-300">
                    {greenboneReportSummary.logCount}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    False Positive
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold text-slate-300">
                    {greenboneReportSummary.falsePositiveCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Scan Timing */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                  Scan Start
                </div>

                <div className="mt-2 break-all font-mono text-[10px] text-slate-300">
                  {greenboneReportSummary.scanStart || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                  Scan End
                </div>

                <div className="mt-2 break-all font-mono text-[10px] text-slate-300">
                  {greenboneReportSummary.scanEnd || "—"}
                </div>
              </div>
            </div>

            {/* Scan Errors */}
            {greenboneReportSummary.errors.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                  GREENBONE SCAN ERRORS
                </div>

                <div className="mt-3 space-y-2">
                  {greenboneReportSummary.errors.map(
                    (error, index) => (
                      <div
                        key={`${error}-${index}`}
                        className="rounded border border-red-500/10 bg-slate-950/50 px-3 py-2 font-mono text-[9px] leading-5 text-red-300"
                      >
                        {error}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Findings */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                    VULNERABILITY FINDINGS
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    Individual findings returned by the completed Greenbone scan.
                  </div>
                </div>

                <div className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[9px] text-slate-400">
                  {greenboneReportSummary.findings.length} FINDINGS
                </div>
              </div>

              {greenboneReportSummary.findings.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-400" />

                  <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    NO VULNERABILITY FINDINGS
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Greenbone did not return any vulnerability findings for this report.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {greenboneReportSummary.findings.map(
                    (finding) => (
                      <div
                        key={finding.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold leading-5 text-slate-200">
                              {finding.name}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[8px] text-slate-400">
                                HOST: {finding.host}
                              </span>

                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[8px] text-slate-400">
                                PORT: {finding.port}
                              </span>

                              {finding.oid && (
                                <span className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[8px] text-slate-500">
                                  OID: {finding.oid}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`rounded border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${
                                finding.severity.toLowerCase() ===
                                "critical"
                                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                                  : finding.severity.toLowerCase() ===
                                      "high"
                                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                                    : finding.severity.toLowerCase() ===
                                        "medium"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                      : finding.severity.toLowerCase() ===
                                          "low"
                                        ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                                        : "border-slate-700 bg-slate-900 text-slate-400"
                              }`}
                            >
                              {finding.severity}
                            </span>

                            {finding.severityScore !== null && (
                              <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[8px] text-slate-300">
                                CVSS {finding.severityScore}
                              </span>
                            )}
                          </div>
                        </div>

                        {finding.description && (
                          <div className="mt-4">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                              Description
                            </div>

                            <div className="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-slate-400">
                              {finding.description}
                            </div>
                          </div>
                        )}

                        {finding.result && (
                          <div className="mt-4">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                              Detection Result
                            </div>

                            <div className="mt-1 whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 font-mono text-[9px] leading-5 text-slate-400">
                              {finding.result}
                            </div>
                          </div>
                        )}

                        {finding.solution && (
                          <div className="mt-4">
                            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                              Recommended Solution
                            </div>

                            <div className="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-emerald-300/80">
                              {finding.solution}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-800 bg-slate-950 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
          GREENBONE / OPENVAS • CYBERLAB SECURITY REPORT
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={
              greenboneReportLoading ||
              !greenboneReportSummary
            }
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            PRINT / SAVE PDF
          </button>

          <button
            type="button"
            onClick={() => setGreenboneReportModalOpen(false)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            CLOSE REPORT
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {greenboneReportLoading && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 animate-spin text-emerald-400" />

              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                LOADING GREENBONE REPORT
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Retrieving and parsing vulnerability-management report data.
            </p>
          </div>
        )}

        

      {/* Future Integration Notice */}

    {/* Future Integration Notice */}
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-5">
      <div className="flex items-start gap-3">

        <Server className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Integration Layer
          </div>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Third-party tools are currently represented as CyberLab
            branches. The next integration stage will add service health
            checks, API connectivity, centralized findings, synchronized
            scan results and unified reporting.
          </p>
        </div>

      </div>
    </div>

  </section>
);
}; 