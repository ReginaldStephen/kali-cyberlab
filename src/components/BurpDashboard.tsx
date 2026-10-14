import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Activity,
  ActivitySquare,
  ArrowLeft,
  CheckCircle2,
  CircleOff,
  Globe,
  List,
  Map,
  RefreshCw,
  Target,
  Radio,
  Send,
  Search,
  Code2,
  Binary,
  Play,
  Trash2,
} from "lucide-react";

interface BurpListener {
  address: string;
  port: number;
  protocol: "tcp" | "unknown";
  source: string;
}

interface BurpCapability {
  id: string;
  name: string;
  category: string;
  description: string;
  available: boolean;
  edition: "community" | "professional" | "unknown";
  status:
    | "available"
    | "limited"
    | "professional"
    | "not-detected";
}

interface BurpStatus {
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

interface BurpStatusResponse {
  success: boolean;
  status: BurpStatus;
  timestamp: string;
}

interface BurpCapabilitiesResponse {
  success: boolean;
  edition: "community" | "professional" | "unknown";
  version: string | null;
  capabilities: BurpCapability[];
  timestamp: string;
}

interface BurpTarget {
  id: string;
  name: string;
  baseUrl: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "unknown";
  inScope: boolean;
  enabled: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface BurpScopeEntry {
  id: string;
  pattern: string;
  include: boolean;
  enabled: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface BurpHttpRecord {
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
  source: string;
  targetId?: string;
  requestState?:
    | "pending"
    | "held"
    | "forwarded"
    | "dropped";
  rawRequest?: string;
  rawResponse?: string;
  stateUpdatedAt?: string;
}

interface BurpSiteMapEntry {
  id: string;
  url: string;
  method: string;
  host: string;
  path: string;
  status: number;
  contentType: string;
  responseBytes: number;
  firstSeen: string;
  lastSeen: string;
  source: string;
}

interface BurpTargetsResponse {
  success: boolean;
  targets: BurpTarget[];
  timestamp: string;
}

interface BurpScopeResponse {
  success: boolean;
  scope: BurpScopeEntry[];
  timestamp: string;
}

interface BurpHistoryResponse {
  success: boolean;
  history: BurpHttpRecord[];
  timestamp: string;
}

interface BurpInterceptResponse {
  success: boolean;
  enabled: boolean;
  queue: BurpHttpRecord[];
  queueCount: number;
  error?: string;
  timestamp: string;
}

interface BurpSiteMapResponse {
  success: boolean;
  siteMap: BurpSiteMapEntry[];
  timestamp: string;
}

interface BurpFinding {
  id: string;
  title: string;
  severity:
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "info";
  confidence:
    | "certain"
    | "firm"
    | "tentative";
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

interface BurpFindingsResponse {
  success: boolean;
  findings: BurpFinding[];
  timestamp: string;
}

interface BurpDashboardProps {
  onBack: () => void;
}

export const BurpDashboard: React.FC<BurpDashboardProps> = ({
  onBack,
}) => {
  const [burpStatus, setBurpStatus] =
    useState<BurpStatus | null>(null);

  const [burpCapabilities, setBurpCapabilities] =
    useState<BurpCapability[]>([]);

  const [burpTargets, setBurpTargets] =
    useState<BurpTarget[]>([]);

  const [burpScope, setBurpScope] =
    useState<BurpScopeEntry[]>([]);

  const [burpHistory, setBurpHistory] =
    useState<BurpHttpRecord[]>([]);

  const [burpSiteMap, setBurpSiteMap] =
    useState<BurpSiteMapEntry[]>([]);

  const [burpFindings, setBurpFindings] =
    useState<BurpFinding[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeWorkspace, setActiveWorkspace] =
    useState<
      | "overview"
      | "targets"
      | "scope"
      | "intercept"
      | "repeater"
      | "history"
      | "site-map"
      | "findings"
    >("overview");

  const [targetName, setTargetName] = useState("");
  const [targetBaseUrl, setTargetBaseUrl] = useState("");
  const [targetNotes, setTargetNotes] = useState("");
  const [creatingTarget, setCreatingTarget] = useState(false);

  const [scopePattern, setScopePattern] = useState("");
  const [scopeInclude, setScopeInclude] = useState(true);
  const [scopeNotes, setScopeNotes] = useState("");
  const [creatingScope, setCreatingScope] = useState(false);

  const [repeaterMethod, setRepeaterMethod] = useState("GET");
  const [repeaterTargetId, setRepeaterTargetId] = useState("");
  const [repeaterUrl, setRepeaterUrl] = useState("");
  const [repeaterHeaders, setRepeaterHeaders] = useState("");
  const [repeaterBody, setRepeaterBody] = useState("");
  const [repeaterResponse, setRepeaterResponse] =
    useState<BurpHttpRecord | null>(null);
  const [sendingRepeater, setSendingRepeater] =
    useState(false);
  const [maskSensitiveValues, setMaskSensitiveValues] =
    useState(true);

  const [burpInterceptEnabled, setBurpInterceptEnabled] =
    useState(false);

  const [burpInterceptQueue, setBurpInterceptQueue] =
    useState<BurpHttpRecord[]>([]);

  const [selectedInterceptId, setSelectedInterceptId] =
    useState<string | null>(null);

  const [interceptMethod, setInterceptMethod] =
    useState("GET");

  const [interceptUrl, setInterceptUrl] =
    useState("");

  const [interceptHeaders, setInterceptHeaders] =
    useState("");

  const [interceptBody, setInterceptBody] =
    useState("");

  const [interceptView, setInterceptView] =
    useState<"raw" | "pretty" | "hex">("pretty");

  const [interceptRepresentation, setInterceptRepresentation] =
    useState<{
      record: BurpHttpRecord;
      requestHex: string;
      responseHex: string;
    } | null>(null);

  const [loadingIntercept, setLoadingIntercept] =
    useState(false);

  const [savingIntercept, setSavingIntercept] =
    useState(false);

  const [sendingIntercept, setSendingIntercept] =
    useState(false);

  const [droppingIntercept, setDroppingIntercept] =
    useState(false);

  const [interceptSearch, setInterceptSearch] =
    useState("");

  const loadInterceptState = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/integrations/burp/intercept",
        {
          credentials: "include",
        }
      );

      const data =
        (await response.json()) as BurpInterceptResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            `Burp intercept state request failed with HTTP ${response.status}`
        );
      }

      setBurpInterceptEnabled(
        data.enabled === true
      );

      setBurpInterceptQueue(
        Array.isArray(data.queue)
          ? data.queue
          : []
      );
    } catch (err: any) {
      console.error(
        "Failed to load Burp intercept state:",
        err
      );
    }
  }, []);

  const selectInterceptRecord = useCallback(
    async (record: BurpHttpRecord) => {
      setSelectedInterceptId(record.id);
      setInterceptMethod(record.method || "GET");
      setInterceptUrl(record.url || "");
      setInterceptHeaders(
        JSON.stringify(
          record.requestHeaders || {},
          null,
          2
        )
      );
      setInterceptBody(record.requestBody || "");
      setInterceptView("pretty");

      try {
        const response = await fetch(
          `/api/integrations/burp/history/${encodeURIComponent(
            record.id
          )}/representation`,
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (response.ok && data?.success && data?.record) {
          setInterceptRepresentation({
            record: data.record as BurpHttpRecord,
            requestHex: String(
              data.requestHex || ""
            ),
            responseHex: String(
              data.responseHex || ""
            ),
          });
        } else {
          setInterceptRepresentation({
            record,
            requestHex: "",
            responseHex: "",
          });
        }
      } catch {
        setInterceptRepresentation({
          record,
          requestHex: "",
          responseHex: "",
        });
      }
    },
    []
  );

  const handleToggleIntercept = async (
    enabled: boolean
  ) => {
    try {
      setError(null);

      const response = await fetch(
        "/api/integrations/burp/intercept",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        }
      );

      const data =
        (await response.json()) as BurpInterceptResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            `Unable to change Burp interception state (HTTP ${response.status}).`
        );
      }

      setBurpInterceptEnabled(
        data.enabled === true
      );

      setBurpInterceptQueue(
        Array.isArray(data.queue)
          ? data.queue
          : []
      );
    } catch (err: any) {
      console.error(
        "Failed to toggle Burp intercept:",
        err
      );

      setError(
        err?.message ||
          "Unable to change Burp interception state."
      );
    }
  };

  const handleUpdateIntercept = async () => {
    if (!selectedInterceptId) {
      setError("Select a held request first.");
      return;
    }

    try {
      setSavingIntercept(true);
      setError(null);

      let headers: Record<string, string> = {};

      if (interceptHeaders.trim()) {
        const parsed = JSON.parse(interceptHeaders);

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          throw new Error(
            "Request headers must be a JSON object."
          );
        }

        headers = parsed as Record<string, string>;
      }

      const response = await fetch(
        `/api/integrations/burp/intercept/${encodeURIComponent(
          selectedInterceptId
        )}/update`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: interceptMethod,
            url: interceptUrl,
            headers,
            body: interceptBody,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.record) {
        throw new Error(
          data?.error ||
            `Unable to update intercepted request (HTTP ${response.status}).`
        );
      }

      const updated =
        data.record as BurpHttpRecord;

      setBurpInterceptQueue((current) =>
        current.map((record) =>
          record.id === updated.id
            ? updated
            : record
        )
      );

      await selectInterceptRecord(updated);
    } catch (err: any) {
      console.error(
        "Failed to update intercepted request:",
        err
      );

      setError(
        err?.message ||
          "Unable to update intercepted request."
      );
    } finally {
      setSavingIntercept(false);
    }
  };

  const handleForwardIntercept = async (
    id: string
  ) => {
    try {
      setSendingIntercept(true);
      setError(null);

      const response = await fetch(
        `/api/integrations/burp/intercept/${encodeURIComponent(
          id
        )}/forward`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.record) {
        throw new Error(
          data?.error ||
            `Unable to forward intercepted request (HTTP ${response.status}).`
        );
      }

      setBurpInterceptQueue((current) =>
        current.filter(
          (record) => record.id !== id
        )
      );

      setInterceptRepresentation({
        record: data.record as BurpHttpRecord,
        requestHex: "",
        responseHex: "",
      });

      await loadDashboard();
      await loadInterceptState();
    } catch (err: any) {
      console.error(
        "Failed to forward intercepted request:",
        err
      );

      setError(
        err?.message ||
          "Unable to forward intercepted request."
      );
    } finally {
      setSendingIntercept(false);
    }
  };

  const handleDropIntercept = async (
    id: string
  ) => {
    try {
      setDroppingIntercept(true);
      setError(null);

      const response = await fetch(
        `/api/integrations/burp/intercept/${encodeURIComponent(
          id
        )}/drop`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.record) {
        throw new Error(
          data?.error ||
            `Unable to drop intercepted request (HTTP ${response.status}).`
        );
      }

      setBurpInterceptQueue((current) =>
        current.filter(
          (record) => record.id !== id
        )
      );

      if (selectedInterceptId === id) {
        setSelectedInterceptId(null);
        setInterceptRepresentation(null);
        setInterceptMethod("GET");
        setInterceptUrl("");
        setInterceptHeaders("");
        setInterceptBody("");
      }

      await loadDashboard();
      await loadInterceptState();
    } catch (err: any) {
      console.error(
        "Failed to drop intercepted request:",
        err
      );

      setError(
        err?.message ||
          "Unable to drop intercepted request."
      );
    } finally {
      setDroppingIntercept(false);
    }
  };

  const handleSendInterceptToRepeater = (
    record?: BurpHttpRecord
  ) => {
    const source =
      record ||
      interceptRepresentation?.record ||
      burpInterceptQueue.find(
        (item) => item.id === selectedInterceptId
      );

    if (!source) {
      setError("Select a request first.");
      return;
    }

    setRepeaterMethod(source.method || "GET");
    setRepeaterUrl(source.url || "");
    setRepeaterTargetId(
      source.targetId || ""
    );
    setRepeaterHeaders(
      JSON.stringify(
        source.requestHeaders || {},
        null,
        2
      )
    );
    setRepeaterBody(
      source.requestBody || ""
    );
    setActiveWorkspace("repeater");
  };

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);

      const [
        statusResponse,
        capabilitiesResponse,
        targetsResponse,
        scopeResponse,
        historyResponse,
        siteMapResponse,
        findingsResponse,
      ] = await Promise.all([
        fetch("/api/integrations/burp/status", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/capabilities", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/targets", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/scope", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/history", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/site-map", {
          credentials: "include",
        }),
        fetch("/api/integrations/burp/findings", {
          credentials: "include",
        }),
      ]);

      if (!statusResponse.ok) {
        throw new Error(
          `Burp status request failed: ${statusResponse.status}`
        );
      }

      if (!capabilitiesResponse.ok) {
        throw new Error(
          `Burp capability request failed: ${capabilitiesResponse.status}`
        );
      }

      if (!targetsResponse.ok) {
        throw new Error(
          `Burp targets request failed: ${targetsResponse.status}`
        );
      }

      if (!scopeResponse.ok) {
        throw new Error(
          `Burp scope request failed: ${scopeResponse.status}`
        );
      }

      if (!historyResponse.ok) {
        throw new Error(
          `Burp history request failed: ${historyResponse.status}`
        );
      }

      if (!siteMapResponse.ok) {
        throw new Error(
          `Burp site-map request failed: ${siteMapResponse.status}`
        );
      }

      if (!findingsResponse.ok) {
        throw new Error(
          `Burp findings request failed: ${findingsResponse.status}`
        );
      }

      const statusData =
        (await statusResponse.json()) as BurpStatusResponse;

      const capabilitiesData =
        (await capabilitiesResponse.json()) as BurpCapabilitiesResponse;

      const targetsData =
        (await targetsResponse.json()) as BurpTargetsResponse;

      const scopeData =
        (await scopeResponse.json()) as BurpScopeResponse;

      const historyData =
        (await historyResponse.json()) as BurpHistoryResponse;

      const siteMapData =
        (await siteMapResponse.json()) as BurpSiteMapResponse;

      const findingsData =
        (await findingsResponse.json()) as BurpFindingsResponse;

      if (statusData.success) {
        setBurpStatus(statusData.status);
      }

      if (capabilitiesData.success) {
        setBurpCapabilities(
          Array.isArray(capabilitiesData.capabilities)
            ? capabilitiesData.capabilities
            : []
        );
      }

      if (targetsData.success) {
        setBurpTargets(
          Array.isArray(targetsData.targets)
            ? targetsData.targets
            : []
        );
      }

      if (scopeData.success) {
        setBurpScope(
          Array.isArray(scopeData.scope)
            ? scopeData.scope
            : []
        );
      }

      if (historyData.success) {
        setBurpHistory(
          Array.isArray(historyData.history)
            ? historyData.history
            : []
        );
      }

      if (siteMapData.success) {
        setBurpSiteMap(
          Array.isArray(siteMapData.siteMap)
            ? siteMapData.siteMap
            : []
        );
      }

      if (findingsData.success) {
        setBurpFindings(
          Array.isArray(findingsData.findings)
            ? findingsData.findings
            : []
        );
      }
    } catch (err: any) {
      console.error(
        "Failed to load Burp dashboard:",
        err
      );

      setError(
        err?.message ||
          "Unable to load Burp Suite dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadInterceptState();

    const interval = window.setInterval(
      loadDashboard,
      30000
    );

    const interceptInterval =
      window.setInterval(
        loadInterceptState,
        5000
      );

    return () => {
      window.clearInterval(interval);
      window.clearInterval(
        interceptInterval
      );
    };
  }, [
    loadDashboard,
    loadInterceptState,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  const handleLaunch = async () => {
    try {
      setLaunching(true);
      setError(null);

      const response = await fetch(
        "/api/integrations/burp/launch",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Burp launch failed with HTTP ${response.status}`
        );
      }

      await new Promise((resolve) =>
        window.setTimeout(resolve, 1500)
      );

      await loadDashboard();
    } catch (error: any) {
      console.error(
        "Failed to launch Burp Suite:",
        error
      );

      setError(
        error?.message ||
          "Unable to launch Burp Suite."
      );
    } finally {
      setLaunching(false);
    }
  };

  const handleCreateTarget = async () => {
    const name = targetName.trim();
    const baseUrl = targetBaseUrl.trim();
    const notes = targetNotes.trim();

    if (!name || !baseUrl) {
      setError("Target name and base URL are required.");
      return;
    }

    try {
      setCreatingTarget(true);
      setError(null);

      const response = await fetch(
        "/api/integrations/burp/targets",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            baseUrl,
            notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Target creation failed with HTTP ${response.status}`
        );
      }

      setTargetName("");
      setTargetBaseUrl("");
      setTargetNotes("");

      await loadDashboard();
    } catch (err: any) {
      console.error(
        "Failed to create Burp target:",
        err
      );

      setError(
        err?.message ||
          "Unable to create Burp target."
      );
    } finally {
      setCreatingTarget(false);
    }
  };

  const handleCreateScope = async () => {
    const pattern = scopePattern.trim();
    const notes = scopeNotes.trim();

    if (!pattern) {
      setError("Scope pattern is required.");
      return;
    }

    try {
      setCreatingScope(true);
      setError(null);

      const response = await fetch(
        "/api/integrations/burp/scope",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pattern,
            include: scopeInclude,
            notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Scope creation failed with HTTP ${response.status}`
        );
      }

      setScopePattern("");
      setScopeNotes("");
      setScopeInclude(true);

      await loadDashboard();
    } catch (err: any) {
      console.error(
        "Failed to create Burp scope entry:",
        err
      );

      setError(
        err?.message ||
          "Unable to create Burp scope entry."
      );
    } finally {
      setCreatingScope(false);
    }
  };

  const handleSendRepeater = async () => {
    const url = repeaterUrl.trim();

    if (!url) {
      setError("Repeater URL is required.");
      return;
    }

    let headers: Record<string, string> = {};

    if (repeaterHeaders.trim()) {
      try {
        const parsed = JSON.parse(repeaterHeaders);

        if (
          !parsed ||
          typeof parsed !== "object" ||
          Array.isArray(parsed)
        ) {
          throw new Error(
            "Headers must be a JSON object."
          );
        }

        headers = Object.fromEntries(
          Object.entries(parsed).map(
            ([key, value]) => [
              key,
              String(value),
            ]
          )
        );
      } catch (err: any) {
        setError(
          err?.message ===
            "Headers must be a JSON object."
            ? err.message
            : 'Headers must be valid JSON, for example {"Accept":"application/json"}.'
        );
        return;
      }
    }

    try {
      setSendingRepeater(true);
      setError(null);
      setRepeaterResponse(null);

      const response = await fetch(
        "/api/integrations/burp/request",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: repeaterMethod,
            url,
            headers,
            body: repeaterBody,
            ...(repeaterTargetId
              ? { targetId: repeaterTargetId }
              : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Repeater request failed with HTTP ${response.status}`
        );
      }

      if (!data.record) {
        throw new Error(
          "Repeater request succeeded but returned no request record."
        );
      }

      setRepeaterResponse(
        data.record as BurpHttpRecord
      );

      await loadDashboard();
    } catch (err: any) {
      console.error(
        "Failed to execute Burp Repeater request:",
        err
      );

      setError(
        err?.message ||
          "Unable to execute Repeater request."
      );
    } finally {
      setSendingRepeater(false);
    }
  };

  const filteredInterceptQueue =
    burpInterceptQueue.filter((record) => {
      const query = interceptSearch
        .trim()
        .toLowerCase();

      if (!query) {
        return true;
      }

      return [
        record.method,
        record.url,
        record.id,
        record.requestState || "",
      ].some((value) =>
        String(value)
          .toLowerCase()
          .includes(query)
      );
    });

  const selectedInterceptRecord =
    burpInterceptQueue.find(
      (record) =>
        record.id === selectedInterceptId
    ) || null;

  const selectedInterceptDisplay =
    selectedInterceptRecord ||
    interceptRepresentation?.record ||
    null;

  const interceptRequestHeadersText =
    selectedInterceptDisplay
      ? Object.entries(
          selectedInterceptDisplay.requestHeaders ||
            {}
        )
          .map(
            ([key, value]) =>
              `${key}: ${value}`
          )
          .join("\n")
      : "";

  const interceptResponseHeadersText =
    selectedInterceptDisplay
      ? Object.entries(
          selectedInterceptDisplay.responseHeaders ||
            {}
        )
          .map(
            ([key, value]) =>
              `${key}: ${value}`
          )
          .join("\n")
      : "";

  const interceptRawRequest =
    interceptRepresentation?.record.rawRequest ||
    selectedInterceptDisplay?.rawRequest ||
    "";

  const interceptRawResponse =
    interceptRepresentation?.record.rawResponse ||
    selectedInterceptDisplay?.rawResponse ||
    "";

  const interceptRequestHex =
    interceptRepresentation?.requestHex || "";

  const interceptResponseHex =
    interceptRepresentation?.responseHex || "";

  const availableCapabilities =
    burpCapabilities.filter(
      (capability) => capability.available
    );

  const unavailableCapabilities =
    burpCapabilities.filter(
      (capability) => !capability.available
    );

  const getDisplayResponseHeaders = (
    headers: Record<string, string>,
  ): Record<string, string> => {
    if (!maskSensitiveValues) return headers;

    const sensitiveHeaderNames = new Set([
      "authorization",
      "proxy-authorization",
      "proxy-authenticate",
      "www-authenticate",
      "set-cookie",
      "cookie",
      "x-api-key",
      "x-auth-token",
      "x-access-token",
      "x-csrf-token",
      "x-xsrf-token",
    ]);

    return Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [
        name,
        sensitiveHeaderNames.has(name.toLowerCase())
          ? "[MASKED]"
          : value,
      ]),
    );
  };

  const getDisplayResponseBody = (
    body: string,
    mimeType?: string | null,
  ): string => {
    if (!maskSensitiveValues || !body) return body;

    const normalizedMime = String(mimeType || "").toLowerCase();

    if (!normalizedMime.includes("json")) return body;

    try {
      const parsed = JSON.parse(body);

      const sensitiveKeys = new Set([
        "access_token",
        "accessToken",
        "api_key",
        "apiKey",
        "authorization",
        "auth_token",
        "authToken",
        "client_secret",
        "clientSecret",
        "csrf_token",
        "csrfToken",
        "id_token",
        "idToken",
        "password",
        "refresh_token",
        "refreshToken",
        "secret",
        "session",
        "session_id",
        "sessionId",
        "token",
      ]);

      const maskValue = (value: unknown): unknown => {
        if (Array.isArray(value)) {
          return value.map(maskValue);
        }

        if (value && typeof value === "object") {
          return Object.fromEntries(
            Object.entries(value).map(([key, child]) => [
              key,
              sensitiveKeys.has(key) ? "[MASKED]" : maskValue(child),
            ]),
          );
        }

        return value;
      };

      return JSON.stringify(maskValue(parsed), null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />

              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">
                Burp Suite
              </h2>
            </div>

            <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
              Web Application Security Data Plane
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={
              launching ||
              burpStatus?.running === true
            }
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Activity className="h-3.5 w-3.5" />
            {launching
              ? "Launching..."
              : burpStatus?.running
                ? "Burp Running"
                : "Launch Burp"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 font-mono text-[9px] text-amber-300">
          {error}
        </div>
      )}

      {/* Operational Workspace Navigation */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-2">
        <div className="flex flex-wrap items-center gap-1">
          {[
            ["overview", "Overview"],
            ["targets", "Targets"],
            ["scope", "Scope"],
            ["intercept", "Intercept"],
            ["repeater", "Repeater"],
            ["history", "HTTP History"],
            ["site-map", "Site Map"],
            ["findings", "Findings"],
          ].map(([id, label]) => {
            const active = activeWorkspace === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setActiveWorkspace(
                    id as
                      | "overview"
                      | "targets"
                      | "scope"
                      | "intercept"
                      | "repeater"
                      | "history"
                      | "site-map"
                      | "findings"
                  )
                }
                className={`rounded-lg px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  active
                    ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border border-transparent text-slate-500 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Intercept Workspace */}
      {activeWorkspace === "intercept" && (
        <section className="rounded-xl border border-cyan-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Radio
                  className={`h-4 w-4 ${
                    burpInterceptEnabled
                      ? "text-emerald-400"
                      : "text-slate-600"
                  }`}
                />
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                  INTERCEPT WORKSPACE
                </div>
              </div>

              <div className="mt-1 font-mono text-[8px] leading-relaxed text-slate-600">
                CyberLab-native request interception queue. Held requests remain
                in scope and are not forwarded until explicitly released.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`rounded-lg border px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-wider ${
                  burpInterceptEnabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 bg-slate-900 text-slate-500"
                }`}
              >
                {burpInterceptEnabled
                  ? "INTERCEPT ON"
                  : "INTERCEPT OFF"}
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400">
                {burpInterceptQueue.length} HELD
              </div>

              <button
                type="button"
                onClick={() =>
                  handleToggleIntercept(
                    !burpInterceptEnabled
                  )
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  burpInterceptEnabled
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                }`}
              >
                <CircleOff className="h-3.5 w-3.5" />
                {burpInterceptEnabled
                  ? "Disable"
                  : "Enable"}
              </button>

              <button
                type="button"
                onClick={() =>
                  loadInterceptState()
                }
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loadingIntercept
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
            {/* Queue */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <div className="border-b border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                    HELD REQUEST QUEUE
                  </div>
                  <div className="font-mono text-[8px] text-slate-600">
                    {filteredInterceptQueue.length} shown
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
                  <input
                    type="text"
                    value={interceptSearch}
                    onChange={(event) =>
                      setInterceptSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search method, URL, ID..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 font-mono text-[9px] text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-500/40"
                  />
                </div>
              </div>

              <div className="max-h-[640px] overflow-y-auto">
                {filteredInterceptQueue.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      No held requests
                    </div>
                    <div className="mt-1 font-mono text-[8px] leading-relaxed text-slate-700">
                      Enable interception and route a scoped
                      request through CyberLab.
                    </div>
                  </div>
                ) : (
                  filteredInterceptQueue.map(
                    (record) => {
                      const active =
                        selectedInterceptId ===
                        record.id;

                      return (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() =>
                            selectInterceptRecord(
                              record
                            )
                          }
                          className={`w-full border-b border-slate-900 p-3 text-left transition-colors ${
                            active
                              ? "bg-cyan-500/10"
                              : "hover:bg-slate-900/70"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 rounded border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase text-amber-300">
                              {record.requestState ||
                                "held"}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] font-bold text-cyan-300">
                                  {record.method}
                                </span>

                                <span className="truncate font-mono text-[8px] text-slate-500">
                                  {new Date(
                                    record.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                              </div>

                              <div className="mt-1 truncate font-mono text-[9px] text-slate-300">
                                {record.url}
                              </div>

                              <div className="mt-1 truncate font-mono text-[7px] text-slate-700">
                                {record.id}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950">
              {!selectedInterceptDisplay ? (
                <div className="flex min-h-[560px] items-center justify-center p-8">
                  <div className="text-center">
                    <ActivitySquare className="mx-auto h-8 w-8 text-slate-700" />
                    <div className="mt-3 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Select a held request
                    </div>
                    <div className="mt-1 max-w-sm font-mono text-[8px] leading-relaxed text-slate-700">
                      Choose an item from the interception queue
                      to inspect, edit, forward, drop, or send
                      it to Repeater.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-800 p-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 font-mono text-[8px] font-bold text-cyan-300">
                          {selectedInterceptDisplay.method}
                        </span>

                        <span
                          className={`rounded border px-2 py-1 font-mono text-[8px] font-bold uppercase ${
                            selectedInterceptDisplay.requestState ===
                            "held"
                              ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
                              : selectedInterceptDisplay.requestState ===
                                "forwarded"
                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          {selectedInterceptDisplay.requestState ||
                            "unknown"}
                        </span>

                        {selectedInterceptDisplay.status !==
                          null && (
                          <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[8px] text-slate-400">
                            HTTP{" "}
                            {selectedInterceptDisplay.status}
                          </span>
                        )}

                        <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-slate-300">
                          {selectedInterceptDisplay.url}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setInterceptView("pretty")
                          }
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[8px] font-bold uppercase tracking-wider ${
                            interceptView === "pretty"
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          Pretty
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setInterceptView("raw")
                          }
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[8px] font-bold uppercase tracking-wider ${
                            interceptView === "raw"
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          <Activity className="h-3.5 w-3.5" />
                          Raw
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setInterceptView("hex")
                          }
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[8px] font-bold uppercase tracking-wider ${
                            interceptView === "hex"
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          <Binary className="h-3.5 w-3.5" />
                          Hex
                        </button>

                        <div className="flex-1" />

                        <button
                          type="button"
                          onClick={() =>
                            handleSendInterceptToRepeater(
                              selectedInterceptDisplay
                            )
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-violet-300 transition-colors hover:bg-violet-500/15"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send to Repeater
                        </button>

                        <button
                          type="button"
                          disabled={
                            selectedInterceptDisplay.requestState !==
                            "held" ||
                            savingIntercept
                          }
                          onClick={
                            handleUpdateIntercept
                          }
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-cyan-500/30 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {savingIntercept
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            selectedInterceptDisplay.requestState !==
                              "held" ||
                            sendingIntercept
                          }
                          onClick={() =>
                            handleForwardIntercept(
                              selectedInterceptDisplay.id
                            )
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {sendingIntercept
                            ? "Forwarding..."
                            : "Forward"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            selectedInterceptDisplay.requestState !==
                              "held" ||
                            droppingIntercept
                          }
                          onClick={() =>
                            handleDropIntercept(
                              selectedInterceptDisplay.id
                            )
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {droppingIntercept
                            ? "Dropping..."
                            : "Drop"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {interceptView === "pretty" && (
                    <div className="grid gap-3 p-3 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                            Request
                          </div>
                          <div className="font-mono text-[7px] text-slate-600">
                            {selectedInterceptDisplay.requestBytes} bytes
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              Method
                            </label>

                            <select
                              value={
                                interceptMethod
                              }
                              onChange={(event) =>
                                setInterceptMethod(
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[9px] font-bold text-cyan-300 outline-none focus:border-cyan-500/40"
                            >
                              {[
                                "GET",
                                "POST",
                                "PUT",
                                "PATCH",
                                "DELETE",
                                "HEAD",
                                "OPTIONS",
                              ].map((method) => (
                                <option
                                  key={method}
                                  value={method}
                                >
                                  {method}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              URL
                            </label>

                            <input
                              type="text"
                              value={interceptUrl}
                              onChange={(event) =>
                                setInterceptUrl(
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[9px] text-slate-200 outline-none focus:border-cyan-500/40"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              Headers — JSON
                            </label>

                            <textarea
                              value={
                                interceptHeaders
                              }
                              onChange={(event) =>
                                setInterceptHeaders(
                                  event.target.value
                                )
                              }
                              rows={10}
                              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[9px] leading-relaxed text-slate-300 outline-none focus:border-cyan-500/40"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              Body
                            </label>

                            <textarea
                              value={interceptBody}
                              onChange={(event) =>
                                setInterceptBody(
                                  event.target.value
                                )
                              }
                              rows={8}
                              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[9px] leading-relaxed text-slate-300 outline-none focus:border-cyan-500/40"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                            Response
                          </div>
                          <div className="font-mono text-[7px] text-slate-600">
                            {selectedInterceptDisplay.responseBytes} bytes
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              Status
                            </label>

                            <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[9px] font-bold text-emerald-300">
                              {selectedInterceptDisplay.status ??
                                "Awaiting response"}
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              Headers
                            </label>

                            <pre className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[8px] leading-relaxed text-slate-400">
                              {interceptResponseHeadersText ||
                                "No response headers yet."}
                            </pre>
                          </div>

                          <div>
                            <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-600">
                              Body
                            </label>

                            <pre className="max-h-[360px] overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[8px] leading-relaxed text-slate-400">
                              {selectedInterceptDisplay.responseBody ||
                                "No response body yet."}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {interceptView === "raw" && (
                    <div className="grid gap-3 p-3 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                          Raw Request
                        </div>
                        <pre className="max-h-[640px] overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[8px] leading-relaxed text-slate-300">
                          {interceptRawRequest ||
                            "No raw request available."}
                        </pre>
                      </div>

                      <div>
                        <div className="mb-2 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                          Raw Response
                        </div>
                        <pre className="max-h-[640px] overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[8px] leading-relaxed text-slate-300">
                          {interceptRawResponse ||
                            "No raw response available yet."}
                        </pre>
                      </div>
                    </div>
                  )}

                  {interceptView === "hex" && (
                    <div className="grid gap-3 p-3 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 flex items-center gap-2 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                          <Binary className="h-3.5 w-3.5" />
                          Request Hex
                        </div>

                        <pre className="max-h-[640px] overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[7px] leading-relaxed text-slate-400">
                          {interceptRequestHex ||
                            "No request hex available."}
                        </pre>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                          <Binary className="h-3.5 w-3.5" />
                          Response Hex
                        </div>

                        <pre className="max-h-[640px] overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[7px] leading-relaxed text-slate-400">
                          {interceptResponseHex ||
                            "No response hex available yet."}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-800 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[7px] uppercase tracking-wider text-slate-700">
                      <span>
                        ID {selectedInterceptDisplay.id}
                      </span>
                      <span>
                        SOURCE {selectedInterceptDisplay.source}
                      </span>
                      <span>
                        REQUEST {selectedInterceptDisplay.requestBytes} B
                      </span>
                      <span>
                        RESPONSE {selectedInterceptDisplay.responseBytes} B
                      </span>
                      <span>
                        {selectedInterceptDisplay.durationMs} MS
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Operational Workspace */}
      {activeWorkspace === "targets" && (
        <section className="rounded-xl border border-emerald-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                TARGET MANAGEMENT
              </div>

              <div className="mt-1 font-mono text-[8px] text-slate-600">
                Define web application targets for CyberLab Burp operations
              </div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
              {burpTargets.length} configured
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Target Name
              </label>

              <input
                type="text"
                value={targetName}
                onChange={(event) =>
                  setTargetName(event.target.value)
                }
                placeholder="My Web Application"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Base URL
              </label>

              <input
                type="text"
                value={targetBaseUrl}
                onChange={(event) =>
                  setTargetBaseUrl(event.target.value)
                }
                placeholder="https://target.example.com:8443"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-500/50"
              />
              <div className="mt-1 font-mono text-[8px] leading-relaxed text-slate-600">
                Authorized HTTP/HTTPS hostname, IP address, port, or application base URL.
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Notes
              </label>

              <input
                type="text"
                value={targetNotes}
                onChange={(event) =>
                  setTargetNotes(event.target.value)
                }
                placeholder="Optional target notes"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCreateTarget}
                disabled={
                  creatingTarget ||
                  !targetName.trim() ||
                  !targetBaseUrl.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Target className="h-3.5 w-3.5" />

                {creatingTarget
                  ? "Creating..."
                  : "Add Target"}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
            {burpTargets.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-[9px] uppercase tracking-wider text-slate-600">
                No targets configured
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {burpTargets.map((target) => (
                  <div
                    key={target.id}
                    className="grid gap-3 px-4 py-3 lg:grid-cols-[1.2fr_1.5fr_auto_auto]"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-slate-200">
                        {target.name}
                      </div>

                      <div className="mt-1 font-mono text-[8px] text-slate-600">
                        {target.host}:{target.port}
                      </div>
                    </div>

                    <div className="font-mono text-[9px] text-cyan-400">
                      {target.baseUrl}
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${
                          target.inScope
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        {target.inScope
                          ? "In Scope"
                          : "Out of Scope"}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${
                          target.enabled
                            ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        {target.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeWorkspace === "scope" && (
        <section className="rounded-xl border border-sky-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-400">
                SCOPE MANAGEMENT
              </div>

              <div className="mt-1 font-mono text-[8px] text-slate-600">
                Control which web resources CyberLab Burp operations may access
              </div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
              {burpScope.length} configured
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.5fr_auto_1fr_auto]">
            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Scope Pattern
              </label>

              <input
                type="text"
                value={scopePattern}
                onChange={(event) =>
                  setScopePattern(event.target.value)
                }
                placeholder="http://127.0.0.1:3000/*"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-sky-500/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Rule
              </label>

              <select
                value={scopeInclude ? "include" : "exclude"}
                onChange={(event) =>
                  setScopeInclude(
                    event.target.value === "include"
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none focus:border-sky-500/50"
              >
                <option value="include">Include</option>
                <option value="exclude">Exclude</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Notes
              </label>

              <input
                type="text"
                value={scopeNotes}
                onChange={(event) =>
                  setScopeNotes(event.target.value)
                }
                placeholder="Optional scope notes"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-sky-500/50"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCreateScope}
                disabled={
                  creatingScope ||
                  !scopePattern.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <List className="h-3.5 w-3.5" />

                {creatingScope
                  ? "Adding..."
                  : "Add Scope"}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
            {burpScope.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-[9px] uppercase tracking-wider text-slate-600">
                No scope entries configured
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {burpScope.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid gap-3 px-4 py-3 lg:grid-cols-[1.5fr_auto_1fr_auto]"
                  >
                    <div>
                      <div className="font-mono text-[10px] text-slate-200">
                        {entry.pattern}
                      </div>

                      {entry.notes && (
                        <div className="mt-1 font-mono text-[8px] text-slate-600">
                          {entry.notes}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${
                          entry.include
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/5 text-rose-400"
                        }`}
                      >
                        {entry.include
                          ? "Include"
                          : "Exclude"}
                      </span>
                    </div>

                    <div className="font-mono text-[8px] text-slate-600">
                      {entry.id}
                    </div>

                    <div>
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${
                          entry.enabled
                            ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        {entry.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeWorkspace === "repeater" && (
        <section className="rounded-xl border border-emerald-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                HTTP REPEATER
              </div>
              <div className="mt-1 font-mono text-[8px] text-slate-600">
                Build and execute controlled HTTP requests against enabled in-scope targets
              </div>
            </div>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-amber-400">
              Server-side scope enforced
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Target
              </label>
              <select
                value={repeaterTargetId}
                onChange={(event) => {
                  const targetId = event.target.value;
                  setRepeaterTargetId(targetId);
                  const target = burpTargets.find((item) => item.id === targetId);
                  if (target && !repeaterUrl.trim()) {
                    setRepeaterUrl(target.baseUrl);
                  }
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none focus:border-emerald-500/50"
              >
                <option value="">Select configured target</option>
                {burpTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name} — {target.baseUrl}
                    {!target.inScope || !target.enabled ? " [NOT OPERATIONAL]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Request URL
              </label>
              <div className="flex gap-2">
                <select
                  value={repeaterMethod}
                  onChange={(event) => setRepeaterMethod(event.target.value)}
                  className="w-28 shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] font-bold text-cyan-400 outline-none focus:border-cyan-500/50"
                >
                  {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={repeaterUrl}
                  onChange={(event) => setRepeaterUrl(event.target.value)}
                  placeholder="https://target.example.com/api/endpoint"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={handleSendRepeater}
                  disabled={sendingRepeater || !repeaterUrl.trim()}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sendingRepeater ? "Sending..." : "Send"}
                </button>
              </div>
              <div className="mt-1 font-mono text-[8px] leading-relaxed text-slate-600">
                URL must resolve to an enabled in-scope target. Paths, queries, and endpoints remain editable.
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Request Headers — JSON
              </label>
              <textarea
                value={repeaterHeaders}
                onChange={(event) => setRepeaterHeaders(event.target.value)}
                rows={7}
                placeholder='{"Accept":"application/json"}'
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-slate-200 outline-none placeholder:text-slate-700 focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Request Body
              </label>
              <textarea
                value={repeaterBody}
                onChange={(event) => setRepeaterBody(event.target.value)}
                rows={7}
                placeholder='{"key":"value"}'
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] leading-relaxed text-slate-200 outline-none placeholder:text-slate-700 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {repeaterResponse && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-400">
                  RESPONSE
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[8px] uppercase tracking-wider">
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-400">
                    HTTP {repeaterResponse.status}
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-500">
                    {repeaterResponse.durationMs} ms
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-500">
                    {repeaterResponse.responseBytes} bytes
                  </span>
                  {repeaterResponse.mimeType && (
                    <span className="max-w-xs truncate rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-500">
                      {repeaterResponse.mimeType}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/40 px-4 py-2">
                <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                  Sensitive value presentation
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMaskSensitiveValues((current) => !current)
                  }
                  className={`rounded-md border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider transition-colors ${
                    maskSensitiveValues
                      ? "border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10"
                      : "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10"
                  }`}
                >
                  {maskSensitiveValues
                    ? "Mask sensitive values"
                    : "Show sensitive values"}
                </button>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[1fr_2fr]">
                <div>
                  <div className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-600">
                    Response Headers
                  </div>

                  <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[9px] leading-relaxed text-slate-400">
                    {JSON.stringify(
                      getDisplayResponseHeaders(
                        repeaterResponse.responseHeaders,
                      ),
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <div>
                  <div className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-600">
                    Response Body
                  </div>

                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[9px] leading-relaxed text-slate-300">
                    {getDisplayResponseBody(
                      repeaterResponse.responseBody,
                      repeaterResponse.mimeType,
                    ) || "(empty response body)"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeWorkspace === "history" && (
        <section className="rounded-xl border border-cyan-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ActivitySquare className="h-4 w-4 text-cyan-400" />
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-400">
                  HTTP HISTORY
                </div>
              </div>
              <div className="mt-1 font-mono text-[8px] text-slate-600">
                Burp HTTP request and response telemetry
              </div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
              {burpHistory.length} requests
            </div>
          </div>

          {burpHistory.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-10 text-center font-mono text-[9px] uppercase tracking-wider text-slate-600">
              No HTTP history recorded.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <div className="divide-y divide-slate-800">
                {burpHistory.map((record) => (
                  <div
                    key={record.id}
                    className="grid gap-3 bg-slate-950/40 px-4 py-3 md:grid-cols-[90px_70px_minmax(0,1fr)_80px_90px]"
                  >
                    <div className="font-mono text-[8px] text-slate-500">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </div>

                    <div className="font-mono text-[9px] font-bold text-cyan-400">
                      {record.method}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-mono text-[9px] text-slate-200">
                        {record.url}
                      </div>
                      <div className="mt-1 font-mono text-[7px] text-slate-600">
                        {record.source}
                      </div>
                    </div>

                    <div className="font-mono text-[9px] font-bold text-slate-300">
                      {record.status || "—"}
                    </div>

                    <div className="font-mono text-[8px] text-slate-500">
                      {record.durationMs} ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeWorkspace === "site-map" && (
        <section className="rounded-xl border border-sky-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-sky-400" />
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-400">
                  SITE MAP
                </div>
              </div>
              <div className="mt-1 font-mono text-[8px] text-slate-600">
                Discovered Burp web application endpoints
              </div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
              {burpSiteMap.length} endpoints
            </div>
          </div>

          {burpSiteMap.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-10 text-center font-mono text-[9px] uppercase tracking-wider text-slate-600">
              No site-map entries recorded.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <div className="divide-y divide-slate-800">
                {burpSiteMap.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid gap-3 bg-slate-950/40 px-4 py-3 md:grid-cols-[70px_minmax(0,1fr)_90px_90px]"
                  >
                    <div className="font-mono text-[9px] font-bold text-cyan-400">
                      {entry.method}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-mono text-[9px] text-slate-200">
                        {entry.url}
                      </div>
                      <div className="mt-1 truncate font-mono text-[7px] text-slate-600">
                        {entry.host}{entry.path}
                      </div>
                    </div>

                    <div className="font-mono text-[9px] font-bold text-slate-300">
                      {entry.status || "—"}
                    </div>

                    <div className="font-mono text-[8px] text-slate-500">
                      {entry.responseBytes} B
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeWorkspace === "findings" && (
        <section className="rounded-xl border border-amber-500/20 bg-slate-950/80 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-400" />
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">
                  FINDINGS
                </div>
              </div>
              <div className="mt-1 font-mono text-[8px] text-slate-600">
                Burp and CyberLab web security findings
              </div>
            </div>

            <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
              {burpFindings.length} findings
            </div>
          </div>

          {burpFindings.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-10 text-center font-mono text-[9px] uppercase tracking-wider text-slate-600">
              No Burp findings recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {burpFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-200">
                        {finding.title}
                      </div>

                      <div className="mt-1 font-mono text-[8px] text-cyan-400">
                        {finding.url || finding.host}
                        {finding.port !== null
                          ? `:${finding.port}`
                          : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 font-mono text-[7px] uppercase tracking-wider">
                      <span className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-amber-400">
                        {finding.severity}
                      </span>

                      <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-500">
                        {finding.confidence}
                      </span>

                      <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-500">
                        {finding.source}
                      </span>
                    </div>
                  </div>

                  {finding.description && (
                    <div className="mt-3 text-[9px] leading-relaxed text-slate-400">
                      {finding.description}
                    </div>
                  )}

                  {finding.evidence && (
                    <div className="mt-3 rounded border border-slate-800 bg-slate-950/70 p-3">
                      <div className="mb-1 font-mono text-[7px] font-bold uppercase tracking-wider text-slate-600">
                        Evidence
                      </div>
                      <div className="whitespace-pre-wrap font-mono text-[8px] leading-relaxed text-slate-500">
                        {finding.evidence}
                      </div>
                    </div>
                  )}

                  {finding.remediation && (
                    <div className="mt-3 rounded border border-emerald-500/10 bg-emerald-500/5 p-3">
                      <div className="mb-1 font-mono text-[7px] font-bold uppercase tracking-wider text-emerald-500">
                        Remediation
                      </div>
                      <div className="text-[8px] leading-relaxed text-slate-500">
                        {finding.remediation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeWorkspace === "overview" && (
        <>
          {/* Live Integration */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
              BURP LIVE INTEGRATION
            </div>

            <div className="mt-1 font-mono text-[8px] text-slate-600">
              Local Burp Suite runtime and edition-aware capability detection
            </div>
          </div>

          {loading && (
            <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-sky-400">
              CHECKING...
            </span>
          )}
        </div>

        {burpStatus ? (
          <>
            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-600">
                    INTEGRATION STATE
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {burpStatus.integrationState === "not-installed" ||
                    burpStatus.integrationState === "stopped" ? (
                      <CircleOff className="h-4 w-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}

                    <span
                      className={`text-xs font-bold uppercase ${
                        burpStatus.integrationState === "not-installed" ||
                        burpStatus.integrationState === "stopped"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {(burpStatus.integrationState || "unknown").replace(/-/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="max-w-xl text-right font-mono text-[8px] leading-relaxed text-slate-500">
                  {burpStatus.message}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  STATUS
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {burpStatus.running ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <CircleOff className="h-4 w-4 text-amber-400" />
                  )}

                  <span
                    className={`text-xs font-bold uppercase ${
                      burpStatus.running
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {burpStatus.running
                      ? "Running"
                      : burpStatus.installed
                        ? "Installed"
                        : "Not Installed"}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  EDITION
                </div>

                <div className="mt-2 text-xs font-bold uppercase text-slate-200">
                  {burpStatus.edition}
                </div>

                <div className="mt-1 font-mono text-[8px] text-slate-600">
                  {burpStatus.version || "Version unavailable"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  PROCESS
                </div>

                <div className="mt-2 font-mono text-xs font-bold text-slate-200">
                  {burpStatus.pid
                    ? `PID ${burpStatus.pid}`
                    : "Not running"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  PROXY LISTENER
                </div>

                <div className="mt-2 font-mono text-[10px] font-bold text-cyan-400">
                  {burpStatus.proxyListener
                    ? `${burpStatus.proxyListener.address}:${burpStatus.proxyListener.port}`
                    : "Not detected"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="text-[8px] uppercase tracking-wider text-slate-600">
                  REST INTEGRATION
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {burpStatus.restConfigured ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <CircleOff className="h-4 w-4 text-slate-600" />
                  )}

                  <span
                    className={`text-xs font-bold uppercase ${
                      burpStatus.restConfigured
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    {burpStatus.restConfigured
                      ? "Configured"
                      : "Not Configured"}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="font-mono text-[9px] text-slate-500">
            Burp Suite integration status unavailable.
          </div>
        )}
      </section>

      {/* Data Plane */}
      <section className="rounded-xl border border-cyan-500/20 bg-slate-950/80 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ActivitySquare className="h-4 w-4 text-cyan-400" />

              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-400">
                DATA PLANE
              </div>
            </div>

            <div className="mt-1 font-mono text-[8px] text-slate-600">
              CyberLab-native Burp telemetry and web testing data
            </div>
          </div>

          <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
            Auto-refresh 30s
          </div>
        </div>

        {/* Counters */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Targets
              </span>
            </div>

            <div className="mt-2 font-mono text-lg font-bold text-white">
              {burpTargets.length}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2">
              <List className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Scope
              </span>
            </div>

            <div className="mt-2 font-mono text-lg font-bold text-white">
              {burpScope.filter(
                (entry) =>
                  entry.include && entry.enabled
              ).length}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                HTTP History
              </span>
            </div>

            <div className="mt-2 font-mono text-lg font-bold text-white">
              {burpHistory.length}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2">
              <Map className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                Site Map
              </span>
            </div>

            <div className="mt-2 font-mono text-lg font-bold text-white">
              {burpSiteMap.length}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* Targets */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  TARGETS
                </span>
              </div>

              <span className="font-mono text-[7px] text-slate-600">
                {burpTargets.length} configured
              </span>
            </div>

            {burpTargets.length === 0 ? (
              <div className="font-mono text-[8px] text-slate-600">
                No Burp targets configured.
              </div>
            ) : (
              <div className="space-y-2">
                {burpTargets.map((target) => (
                  <div
                    key={target.id}
                    className="rounded border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[9px] font-bold text-slate-200">
                        {target.name}
                      </div>

                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[7px] font-bold uppercase ${
                          target.inScope
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-700 text-slate-500"
                        }`}
                      >
                        {target.inScope
                          ? "IN SCOPE"
                          : "OUT"}
                      </span>
                    </div>

                    <div className="mt-1 truncate font-mono text-[8px] text-cyan-400">
                      {target.baseUrl}
                    </div>

                    <div className="mt-1 font-mono text-[7px] text-slate-600">
                      {target.host}:{target.port} ·{" "}
                      {target.protocol} ·{" "}
                      {target.enabled
                        ? "enabled"
                        : "disabled"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scope */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  SCOPE
                </span>
              </div>

              <span className="font-mono text-[7px] text-slate-600">
                {burpScope.length} rules
              </span>
            </div>

            {burpScope.length === 0 ? (
              <div className="font-mono text-[8px] text-slate-600">
                No scope rules configured.
              </div>
            ) : (
              <div className="space-y-2">
                {burpScope.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[8px] text-slate-300">
                        {entry.pattern}
                      </span>

                      <span
                        className={`shrink-0 text-[7px] font-bold uppercase ${
                          entry.include
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {entry.include
                          ? "INCLUDE"
                          : "EXCLUDE"}
                      </span>
                    </div>

                    <div className="mt-1 font-mono text-[7px] text-slate-600">
                      {entry.enabled
                        ? "enabled"
                        : "disabled"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HTTP History */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  HTTP HISTORY
                </span>
              </div>

              <span className="font-mono text-[7px] text-slate-600">
                {burpHistory.length} requests
              </span>
            </div>

            {burpHistory.length === 0 ? (
              <div className="font-mono text-[8px] text-slate-600">
                No HTTP history recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {burpHistory.slice(0, 10).map((record) => (
                  <div
                    key={record.id}
                    className="rounded border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 font-mono text-[8px] font-bold text-cyan-400">
                          {record.method}
                        </span>

                        <span className="truncate font-mono text-[8px] text-slate-300">
                          {record.url}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 font-mono text-[8px] font-bold ${
                          record.status >= 400
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>

                    <div className="mt-1 flex gap-3 font-mono text-[7px] text-slate-600">
                      <span>
                        {record.durationMs}ms
                      </span>
                      <span>
                        {record.responseBytes} bytes
                      </span>
                      <span>
                        {record.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Site Map */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  SITE MAP
                </span>
              </div>

              <span className="font-mono text-[7px] text-slate-600">
                {burpSiteMap.length} endpoints
              </span>
            </div>

            {burpSiteMap.length === 0 ? (
              <div className="font-mono text-[8px] text-slate-600">
                No site-map entries recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {burpSiteMap.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[8px] text-slate-300">
                        {entry.method} {entry.path}
                      </div>

                      <div className="mt-1 truncate font-mono text-[7px] text-slate-600">
                        {entry.host} ·{" "}
                        {entry.contentType} ·{" "}
                        {entry.responseBytes} bytes
                      </div>
                    </div>

                    <div
                      className={`shrink-0 font-mono text-[8px] font-bold ${
                        entry.status >= 400
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {entry.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="mb-4">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
            CAPABILITIES
          </div>

          <div className="mt-1 font-mono text-[8px] text-slate-600">
            Edition-aware Burp Suite capability detection
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {availableCapabilities.map((capability) => (
            <div
              key={capability.id}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />

                <span className="text-[9px] font-bold text-slate-200">
                  {capability.name}
                </span>
              </div>

              <div className="mt-1 font-mono text-[7px] text-slate-600">
                {capability.category}
              </div>
            </div>
          ))}

          {unavailableCapabilities.map((capability) => (
            <div
              key={capability.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
            >
              <div className="flex items-center gap-2">
                <CircleOff className="h-3.5 w-3.5 text-slate-600" />

                <span className="text-[9px] font-bold text-slate-500">
                  {capability.name}
                </span>
              </div>

              <div className="mt-1 font-mono text-[7px] text-slate-700">
                {capability.description}
              </div>
            </div>
          ))}
        </div>
      </section>
        </>
      )}

    </div>
  );
};

export default BurpDashboard;
