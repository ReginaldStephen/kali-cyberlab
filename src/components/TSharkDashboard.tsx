import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Circle,
  Database,
  FileSearch,
  Network,
  Play,
  Search,
  Server,
  Square,
  Wifi,
  XCircle,
} from "lucide-react";

interface TSharkInterface {
  id: string;
  name: string;
}

interface TSharkPacket {
  number: number;
  timestamp: string;
  source: string;
  destination: string;
  sourceMac: string;
  destinationMac: string;
  ipv4Source: string;
  ipv4Destination: string;
  ipv6Source: string;
  ipv6Destination: string;
  ipProtocol: string;
  protocol: string;
  length: number;
  sourcePort?: number;
  destinationPort?: number;
  info: string;
}

interface TSharkCapture {
  running: boolean;
  interface: string;
  startedAt: string | null;
  stoppedAt: string | null;
  packetCount: number;
  packets: TSharkPacket[];
  pid: number | null;
  error: string | null;
}

interface TSharkStatistics {
  packetCount: number;
  totalBytes: number;
  protocols: {
    name: string;
    count: number;
  }[];
  topSources: {
    name: string;
    count: number;
  }[];
  topDestinations: {
    name: string;
    count: number;
  }[];
  topPorts: {
    name: string;
    count: number;
  }[];
}

interface TSharkDashboardProps {
  onBack: () => void;
}


interface TSharkPcapAnalysis {
  file: string;
  packetCount: number;
  firstPacketTime: string;
  lastPacketTime: string;
  durationSeconds: number;
  totalBytes: number;
  protocolHierarchy: {
    protocol: string;
    packets: number;
    bytes: number;
  }[];
}

interface TSharkEndpointResult {
  file: string;
  rows: Record<string, string>[];
}

interface TSharkConversationResult {
  file: string;
  rows: Record<string, string>[];
}

interface TSharkExpertResult {
  file: string;
  rows: Record<string, string>[];
}

interface TSharkPacketDetail {
  packetNumber: number;
  timestamp: string;
  protocols: Record<string, unknown>;
  raw: Record<string, string>;
}

interface TSharkField {
  type: string;
  field: string;
  displayName: string;
  protocol: string;
  parent: string;
}

interface TSharkFieldExtractionResult {
  file: string;
  fields: string[];
  displayFilter: string;
  rows: Record<string, string>[];
  count: number;
}


export const TSharkDashboard: React.FC<
  TSharkDashboardProps
> = ({ onBack }) => {
  const [version, setVersion] =
    useState<string>("Checking...");

  const [interfaces, setInterfaces] =
    useState<TSharkInterface[]>([]);

  const [selectedInterface, setSelectedInterface] =
    useState<string>("any");

  const [capture, setCapture] =
    useState<TSharkCapture | null>(null);

  const [packets, setPackets] =
    useState<TSharkPacket[]>([]);

  const [statistics, setStatistics] =
    useState<TSharkStatistics | null>(null);

  const [packetLimit, setPacketLimit] =
    useState<number>(100);

  const [captureFilter, setCaptureFilter] =
    useState<string>("");

  const [displayFilter, setDisplayFilter] =
    useState<string>("");

  const [appliedDisplayFilter, setAppliedDisplayFilter] =
    useState<string>("");

  const [filteredPacketCount, setFilteredPacketCount] =
    useState<number>(0);

  const [selectedPacket, setSelectedPacket] =
    useState<TSharkPacket | null>(null);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [actionLoading, setActionLoading] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string>("");


  // PCAP Analysis Center
  const [pcapFile, setPcapFile] =
    useState<string>("");

  const [pcapAnalysis, setPcapAnalysis] =
    useState<TSharkPcapAnalysis | null>(null);

  const [pcapEndpoints, setPcapEndpoints] =
    useState<TSharkEndpointResult | null>(null);

  const [pcapConversations, setPcapConversations] =
    useState<TSharkConversationResult | null>(null);

  const [pcapExpert, setPcapExpert] =
    useState<TSharkExpertResult | null>(null);

  const [pcapPacketNumber, setPcapPacketNumber] =
    useState<string>("");

  const [pcapPacketDetail, setPcapPacketDetail] =
    useState<TSharkPacketDetail | null>(null);

  const [pcapLoading, setPcapLoading] =
    useState<boolean>(false);

  const [pcapSection, setPcapSection] =
    useState<
      "overview" |
      "explorer" |
      "endpoints" |
      "conversations" |
      "expert"
    >("overview");

  const [pcapSearch, setPcapSearch] =
    useState<string>("");

  // TShark Packet Explorer / Field Extraction
  const [tsharkFields, setTsharkFields] =
    useState<TSharkField[]>([]);

  const [tsharkFieldSearch, setTsharkFieldSearch] =
    useState<string>("");

  const [selectedTSharkFields, setSelectedTSharkFields] =
    useState<string[]>([
      "frame.number",
      "frame.time",
      "ip.src",
      "ip.dst",
      "tcp.srcport",
      "tcp.dstport",
    ]);

  const [tsharkFieldFilter, setTsharkFieldFilter] =
    useState<string>("");

  const [tsharkFieldLoading, setTsharkFieldLoading] =
    useState<boolean>(false);

  const [tsharkExtractionLoading, setTsharkExtractionLoading] =
    useState<boolean>(false);

  const [tsharkExtraction, setTsharkExtraction] =
    useState<TSharkFieldExtractionResult | null>(null);

  const [tsharkFieldPanelOpen, setTsharkFieldPanelOpen] =
    useState<boolean>(false);

  const renderTSharkValue = (
    value: unknown,
    depth: number = 0
  ): React.ReactNode => {
    if (value === null || value === undefined) {
      return (
        <span className="text-slate-500">
          —
        </span>
      );
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return (
        <span className="break-all text-slate-300">
          {String(value)}
        </span>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div
              key={`${depth}-${index}`}
              className="rounded border border-slate-800/80 bg-slate-950/40 p-2"
            >
              <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
                Item {index + 1}
              </div>

              {renderTSharkValue(item, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(
        value as Record<string, unknown>
      );

      if (entries.length === 0) {
        return (
          <span className="text-slate-500">
            —
          </span>
        );
      }

      return (
        <div className="space-y-1">
          {entries.map(([key, child]) => (
            <div
              key={`${depth}-${key}`}
              className="rounded border border-slate-800/70 bg-slate-950/30 p-2"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-cyan-300">
                  {key}
                </span>
              </div>

              <div className="pl-2">
                {renderTSharkValue(child, depth + 1)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <span className="break-all text-slate-300">
        {String(value)}
      </span>
    );
  };

  const renderTSharkProtocolTree = (
    protocols: Record<string, unknown>
  ): React.ReactNode => {
    const entries = Object.entries(protocols || {});

    if (entries.length === 0) {
      return (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-500">
          TShark returned no decoded protocol fields for this packet.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map(([protocol, value]) => (
          <details
            key={protocol}
            open
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60"
          >
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900">
              <span className="font-mono text-cyan-300">
                {protocol}
              </span>
            </summary>

            <div className="border-t border-slate-800 p-3">
              {renderTSharkValue(value)}
            </div>
          </details>
        ))}
      </div>
    );
  };



  const analyzePcap = useCallback(
    async () => {
      const file = pcapFile.trim();

      if (!file) {
        setError(
          "Enter the full path to a PCAP or PCAPNG file."
        );
        return;
      }

      setPcapLoading(true);
      setError("");

      try {
        const query = encodeURIComponent(file);

        const [
          analysisResponse,
          endpointsResponse,
          conversationsResponse,
          expertResponse,
        ] = await Promise.all([
          fetch(
            `/api/integrations/tshark/pcap/analyze?file=${query}`
          ),
          fetch(
            `/api/integrations/tshark/pcap/endpoints?file=${query}`
          ),
          fetch(
            `/api/integrations/tshark/pcap/conversations?file=${query}`
          ),
          fetch(
            `/api/integrations/tshark/pcap/expert?file=${query}`
          ),
        ]);

        const analysisData =
          await analysisResponse.json();

        const endpointsData =
          await endpointsResponse.json();

        const conversationsData =
          await conversationsResponse.json();

        const expertData =
          await expertResponse.json();

        if (!analysisResponse.ok) {
          throw new Error(
            analysisData?.error ||
              "Unable to analyze the capture file."
          );
        }

        if (!endpointsResponse.ok) {
          throw new Error(
            endpointsData?.error ||
              "Unable to retrieve endpoints."
          );
        }

        if (!conversationsResponse.ok) {
          throw new Error(
            conversationsData?.error ||
              "Unable to retrieve conversations."
          );
        }

        if (!expertResponse.ok) {
          throw new Error(
            expertData?.error ||
              "Unable to retrieve expert information."
          );
        }

        setPcapAnalysis(
          analysisData?.analysis || null
        );
        setPcapEndpoints({
          file:
            endpointsData?.file ||
            pcapFile,
          rows:
            Array.isArray(
              endpointsData?.output
            )
              ? endpointsData.output
              : [],
        });

        setPcapConversations({
          file:
            conversationsData?.file ||
            pcapFile,
          rows:
            Array.isArray(
              conversationsData?.output
            )
              ? conversationsData.output
              : [],
        });

        setPcapExpert({
          file:
            expertData?.file ||
            pcapFile,
          rows:
            Array.isArray(
              expertData?.output
            )
              ? expertData.output
              : [],
        });
        setPcapPacketDetail(null);
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to analyze the capture file."
        );
      } finally {
        setPcapLoading(false);
      }
    },
    [pcapFile]
  );

  const loadTSharkFields = useCallback(
    async () => {
      setTsharkFieldLoading(true);
      setError("");

      try {
        const query = tsharkFieldSearch.trim()
          ? `?search=${encodeURIComponent(
              tsharkFieldSearch.trim()
            )}`
          : "";

        const response = await fetch(
          `/api/integrations/tshark/fields${query}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to retrieve TShark fields."
          );
        }

        setTsharkFields(
          Array.isArray(data?.fields)
            ? data.fields
            : Array.isArray(data)
              ? data
              : []
        );
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to retrieve TShark fields."
        );
      } finally {
        setTsharkFieldLoading(false);
      }
    },
    [tsharkFieldSearch]
  );

  const extractTSharkFieldsFromPcap = useCallback(
    async () => {
      const file = pcapFile.trim();

      if (!file) {
        setError(
          "Enter a PCAP or PCAPNG file path first."
        );
        return;
      }

      if (selectedTSharkFields.length === 0) {
        setError(
          "Select at least one TShark field."
        );
        return;
      }

      setTsharkExtractionLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/integrations/tshark/pcap/extract",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file,
              fields: selectedTSharkFields,
              displayFilter:
                tsharkFieldFilter.trim(),
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to extract TShark fields."
          );
        }

        setTsharkExtraction({
          file: data?.file || file,
          fields:
            Array.isArray(data?.fields)
              ? data.fields
              : selectedTSharkFields,
          displayFilter:
            typeof data?.displayFilter === "string"
              ? data.displayFilter
              : tsharkFieldFilter.trim(),
          rows:
            Array.isArray(data?.rows)
              ? data.rows
              : [],
          count:
            typeof data?.count === "number"
              ? data.count
              : Array.isArray(data?.rows)
                ? data.rows.length
                : 0,
        });
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to extract TShark fields."
        );
      } finally {
        setTsharkExtractionLoading(false);
      }
    },
    [
      pcapFile,
      selectedTSharkFields,
      tsharkFieldFilter,
    ]
  );

  const toggleTSharkField = useCallback(
    (field: string) => {
      setSelectedTSharkFields((current) =>
        current.includes(field)
          ? current.filter(
              (item) => item !== field
            )
          : [...current, field]
      );
    },
    []
  );

  const removeTSharkField = useCallback(
    (field: string) => {
      setSelectedTSharkFields((current) =>
        current.filter(
          (item) => item !== field
        )
      );
    },
    []
  );

  const clearTSharkExtraction = useCallback(
    () => {
      setTsharkExtraction(null);
    },
    []
  );

  const loadPcapPacketDetail = useCallback(
    async () => {
      const file = pcapFile.trim();

      const packetNumber =
        Number.parseInt(
          pcapPacketNumber.trim(),
          10
        );

      if (!file) {
        setError(
          "Enter a PCAP or PCAPNG file path first."
        );
        return;
      }

      if (
        !Number.isInteger(packetNumber) ||
        packetNumber < 1
      ) {
        setError(
          "Enter a valid packet number."
        );
        return;
      }

      setPcapLoading(true);
      setError("");

      try {
        const query =
          `file=${encodeURIComponent(file)}` +
          `&packet=${encodeURIComponent(
            String(packetNumber)
          )}`;

        const response = await fetch(
          `/api/integrations/tshark/pcap/packet?${query}`
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to retrieve packet details."
          );
        }

        setPcapPacketDetail(data?.packet || null);
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to retrieve packet details."
        );
      } finally {
        setPcapLoading(false);
      }
    },
    [pcapFile, pcapPacketNumber]
  );

  const filteredPcapRows = useCallback(
    (
      rows:
        | Record<string, string>[]
        | undefined
    ) => {
      if (!rows) return [];

      const search =
        pcapSearch.trim().toLowerCase();

      if (!search) return rows;

      return rows.filter((row) =>
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    },
    [pcapSearch]
  );

  const formatPcapDuration = (
    seconds: number
  ) => {
    if (!Number.isFinite(seconds)) {
      return "—";
    }

    if (seconds < 1) {
      return `${seconds.toFixed(3)} s`;
    }

    if (seconds < 60) {
      return `${seconds.toFixed(2)} s`;
    }

    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return (
      `${minutes}m ` +
      `${remainingSeconds.toFixed(1)}s`
    );
  };

  const loadStatus = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/integrations/tshark/status"
        );

        if (!response.ok) {
          throw new Error(
            `TShark status request failed: ${response.status}`
          );
        }

        const data = await response.json();

        setVersion(data.version || "TShark");
        setCapture(data.capture || null);
        setError("");
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to connect to TShark."
        );
      }
    },
    []
  );

  const loadInterfaces = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/integrations/tshark/interfaces"
        );

        if (!response.ok) {
          throw new Error(
            `Interface request failed: ${response.status}`
          );
        }

        const data = await response.json();

        const loadedInterfaces =
          Array.isArray(data.interfaces)
            ? data.interfaces
            : [];

        setInterfaces(loadedInterfaces);

        if (
          loadedInterfaces.length > 0 &&
          !loadedInterfaces.some(
            (item: TSharkInterface) =>
              item.name === selectedInterface
          )
        ) {
          setSelectedInterface(
            loadedInterfaces[0].name
          );
        }
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to retrieve TShark interfaces."
        );
      }
    },
    [selectedInterface]
  );

  const loadPackets = useCallback(
    async () => {
      try {
        const params = new URLSearchParams();

        if (appliedDisplayFilter.trim()) {
          params.set(
            "filter",
            appliedDisplayFilter.trim()
          );
        }

        const query =
          params.toString();

        const response = await fetch(
          `/api/integrations/tshark/packets${
            query ? `?${query}` : ""
          }`
        );

        if (!response.ok) {
          throw new Error(
            `Packet request failed: ${response.status}`
          );
        }

        const data = await response.json();

        const loadedPackets =
          Array.isArray(data.packets)
            ? data.packets
            : [];

        setPackets(loadedPackets);

        setFilteredPacketCount(
          Number(
            data.filteredPacketCount ??
              loadedPackets.length
          )
        );

        setCapture((current) => ({
          ...(current || {
            running: false,
            interface: "",
            captureFilter: "",
            displayFilter: "",
            startedAt: null,
            stoppedAt: null,
            packetCount: 0,
            packets: [],
            pid: null,
            error: null,
          }),
          running: Boolean(data.running),
          interface:
            data.interface ||
            current?.interface ||
            "",
          captureFilter:
            data.captureFilter ||
            current?.captureFilter ||
            "",
          displayFilter:
            data.displayFilter ||
            appliedDisplayFilter ||
            "",
          packetCount:
            Number(data.packetCount) || 0,
        }));
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to retrieve captured packets."
        );
      }
    },
    [appliedDisplayFilter]
  );

  const loadStatistics = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/integrations/tshark/statistics"
        );

        if (!response.ok) {
          throw new Error(
            `Statistics request failed: ${response.status}`
          );
        }

        const data = await response.json();

        setStatistics(
          data.statistics || null
        );
      } catch (err: any) {
        setError(
          err?.message ||
            "Unable to retrieve TShark statistics."
        );
      }
    },
    []
  );

  const refreshAll = useCallback(
    async () => {
      await Promise.all([
        loadStatus(),
        loadInterfaces(),
        loadPackets(),
        loadStatistics(),
      ]);

      setLoading(false);
    },
    [
      loadStatus,
      loadInterfaces,
      loadPackets,
      loadStatistics,
    ]
  );

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadStatus();
      loadPackets();
      loadStatistics();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    loadStatus,
    loadPackets,
    loadStatistics,
  ]);

  const applyDisplayFilter = (filter: string) => {
    setAppliedDisplayFilter(filter.trim());
  };

  const clearDisplayFilter = () => {
    setDisplayFilter("");
    setAppliedDisplayFilter("");
  };

  const quickDisplayFilters = [
    "tcp",
    "udp",
    "dns",
    "http",
    "tls",
    "icmp",
    "arp",
    "ssh",
  ];

  const clearPackets = async () => {
    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        "/api/integrations/tshark/capture/clear",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to clear captured packets."
        );
      }

      setPackets([]);
      setFilteredPacketCount(0);
      setStatistics(null);

      await loadStatus();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to clear captured packets."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const startCapture = async () => {
    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        "/api/integrations/tshark/capture/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interface: selectedInterface,
            count: packetLimit,
            captureFilter:
              captureFilter.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to start TShark capture."
        );
      }

      setCapture(data.capture || null);

      await Promise.all([
        loadPackets(),
        loadStatistics(),
      ]);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to start TShark capture."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const stopCapture = async () => {
    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        "/api/integrations/tshark/capture/stop",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to stop TShark capture."
        );
      }

      setCapture(data.capture || null);

      await Promise.all([
        loadPackets(),
        loadStatistics(),
      ]);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to stop TShark capture."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  };

  return (
    <section className="min-h-full bg-slate-950 p-4 text-white md:p-6">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-emerald-500 hover:text-white"
            title="Back to Security Arsenal"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-emerald-400" />
              <h1 className="text-lg font-black uppercase tracking-wider">
                TShark Network Analyzer
              </h1>
            </div>

            <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Live packet capture • protocol analysis • network visibility
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
          <Circle
            className={`h-2.5 w-2.5 ${
              capture?.running
                ? "fill-emerald-400 text-emerald-400"
                : "fill-slate-600 text-slate-600"
            }`}
          />

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {capture?.running
              ? "CAPTURE RUNNING"
              : "CAPTURE IDLE"}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Status cards */}
      <div className="mb-5 grid gap-3 md:grid-cols-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Activity className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              Engine
            </span>
          </div>

          <div className="text-sm font-bold text-emerald-400">
            {loading ? "CHECKING..." : "ONLINE"}
          </div>

          <div className="mt-1 truncate text-[9px] font-mono text-slate-500">
            {version}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Network className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              Interface
            </span>
          </div>

          <div className="truncate text-sm font-bold text-white">
            {capture?.interface ||
              selectedInterface ||
              "—"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              Packets
            </span>
          </div>

          <div className="text-xl font-black text-white">
            {capture?.packetCount || 0}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <ArrowDown className="h-4 w-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              Captured Data
            </span>
          </div>

          <div className="text-xl font-black text-white">
            {formatBytes(
              statistics?.totalBytes || 0
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/70 p-4">

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-wider">
              Capture Controls
            </h2>
          </div>

          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            TShark Capture Engine
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_180px]">

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">
              Network Interface
            </label>

            <select
              value={selectedInterface}
              onChange={(event) =>
                setSelectedInterface(
                  event.target.value
                )
              }
              disabled={capture?.running || actionLoading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              {interfaces.length === 0 ? (
                <option value="any">
                  any
                </option>
              ) : (
                interfaces.map((item) => (
                  <option
                    key={item.id}
                    value={item.name}
                  >
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">
              Packet Limit
            </label>

            <input
              type="number"
              min={1}
              max={5000}
              value={packetLimit}
              onChange={(event) =>
                setPacketLimit(
                  Math.min(
                    Math.max(
                      Number(event.target.value) || 1,
                      1
                    ),
                    5000
                  )
                )
              }
              disabled={
                capture?.running ||
                actionLoading
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-50"
              placeholder="Packet limit"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">
              Capture Filter
            </label>

            <input
              type="text"
              value={captureFilter}
              onChange={(event) =>
                setCaptureFilter(
                  event.target.value
                )
              }
              disabled={
                capture?.running ||
                actionLoading
              }
              placeholder="Example: tcp port 443"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white outline-none placeholder:text-slate-700 focus:border-emerald-500 disabled:opacity-50"
            />

            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-600">
              <span>host 192.168.1.10</span>
              <span>tcp port 443</span>
              <span>udp port 53</span>
              <span>net 192.168.1.0/24</span>
            </div>
          </div>

        </div>

        <div className="mt-4 flex flex-wrap gap-2">

          <button
            onClick={startCapture}
            disabled={
              Boolean(capture?.running) ||
              actionLoading
            }
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            Start Capture
          </button>

          <button
            onClick={stopCapture}
            disabled={
              !capture?.running ||
              actionLoading
            }
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" />
            Stop Capture
          </button>

          <button
            onClick={clearPackets}
            disabled={
              Boolean(capture?.running) ||
              actionLoading ||
              packets.length === 0
            }
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear Packets
          </button>

        </div>

      </div>

      {/* Display Filter */}
      <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/70 p-4">

        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Display Filter
            </h2>

            <p className="mt-1 text-[9px] text-slate-500">
              Filter the packets already captured without restarting TShark.
            </p>
          </div>

          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
            Wireshark-style filtering
          </span>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">

          <input
            type="text"
            value={displayFilter}
            onChange={(event) =>
              setDisplayFilter(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyDisplayFilter(
                  displayFilter
                );
              }
            }}
            placeholder="Example: ssh, tcp, udp, dns, ip.addr == 192.168.1.10"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white outline-none placeholder:text-slate-700 focus:border-emerald-500"
          />

          <button
            onClick={() =>
              applyDisplayFilter(
                displayFilter
              )
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-500"
          >
            Apply
          </button>

          <button
            onClick={clearDisplayFilter}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 transition hover:bg-slate-700"
          >
            Clear
          </button>

        </div>

        <div className="mt-3">

          <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-600">
            Quick Filters
          </div>

          <div className="flex flex-wrap gap-2">

            {quickDisplayFilters.map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setDisplayFilter(
                      filter
                    );
                    applyDisplayFilter(
                      filter
                    );
                  }}
                  className={`rounded-md border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition ${
                    appliedDisplayFilter ===
                    filter
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              )
            )}

          </div>

        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-600">
          <span>
            Captured: {capture?.packetCount ?? 0}
          </span>

          <span>
            Displayed: {filteredPacketCount}
          </span>

          {appliedDisplayFilter && (
            <span className="text-emerald-500">
              Filter: {appliedDisplayFilter}
            </span>
          )}
        </div>

      </div>

      {/* Statistics */}
      <div className="mb-5 grid gap-4 lg:grid-cols-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-wider">
              Capture Summary
            </h2>

            <Activity className="h-4 w-4 text-slate-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                Packets
              </div>

              <div className="mt-1 text-lg font-black text-emerald-400">
                {statistics?.packetCount ?? 0}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                Bytes
              </div>

              <div className="mt-1 text-lg font-black text-sky-400">
                {statistics?.totalBytes ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-wider">
              Protocols
            </h2>

            <BarChart3 className="h-4 w-4 text-slate-500" />
          </div>

          <div className="space-y-2">
            {(statistics?.protocols || [])
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[10px]"
                >
                  <span className="font-mono text-slate-300">
                    {item.name}
                  </span>

                  <span className="font-bold text-emerald-400">
                    {item.count}
                  </span>
                </div>
              ))}

            {(!statistics?.protocols ||
              statistics.protocols.length === 0) && (
              <div className="text-[10px] text-slate-600">
                No protocol data yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-wider">
              Top Sources
            </h2>

            <ArrowRight className="h-4 w-4 text-slate-500" />
          </div>

          <div className="space-y-2">
            {(statistics?.topSources || [])
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[10px]"
                >
                  <span className="truncate font-mono text-slate-300">
                    {item.name}
                  </span>

                  <span className="ml-3 font-bold text-sky-400">
                    {item.count}
                  </span>
                </div>
              ))}

            {(!statistics?.topSources ||
              statistics.topSources.length === 0) && (
              <div className="text-[10px] text-slate-600">
                No source data yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-wider">
              Top Destinations
            </h2>

            <ArrowDown className="h-4 w-4 text-slate-500" />
          </div>

          <div className="space-y-2">
            {(statistics?.topDestinations || [])
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[10px]"
                >
                  <span className="truncate font-mono text-slate-300">
                    {item.name}
                  </span>

                  <span className="ml-3 font-bold text-violet-400">
                    {item.count}
                  </span>
                </div>
              ))}

            {(!statistics?.topDestinations ||
              statistics.topDestinations.length === 0) && (
              <div className="text-[10px] text-slate-600">
                No destination data yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-wider">
              Top Ports
            </h2>

            <ArrowDown className="h-4 w-4 text-slate-500" />
          </div>

          <div className="space-y-2">
            {(statistics?.topPorts || [])
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[10px]"
                >
                  <span className="font-mono text-slate-300">
                    {item.name}
                  </span>

                  <span className="font-bold text-amber-400">
                    {item.count}
                  </span>
                </div>
              ))}

            {(!statistics?.topPorts ||
              statistics.topPorts.length === 0) && (
              <div className="text-[10px] text-slate-600">
                No port data yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Packet table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">

        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />

            <h2 className="text-[10px] font-black uppercase tracking-wider">
              Live Packet Stream
            </h2>
          </div>

          <span className="font-mono text-[9px] text-slate-500">
            {packets.length} buffered
          </span>
        </div>

        {selectedPacket && (
          <div className="border-b border-slate-800 bg-slate-950/90 p-4">

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />

                  <h3 className="text-[10px] font-black uppercase tracking-wider text-white">
                    Packet Inspector
                  </h3>
                </div>

                <p className="mt-1 text-[9px] text-slate-600">
                  Live packet details extracted directly from TShark.
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedPacket(null)
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 transition hover:border-slate-600 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Frame */}
            <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4">

              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <h4 className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                  Frame
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Packet Number
                  </div>

                  <div className="mt-1 font-mono text-xs font-bold text-white">
                    #{selectedPacket.number}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Timestamp
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-slate-300">
                    {selectedPacket.timestamp || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Frame Length
                  </div>

                  <div className="mt-1 font-mono text-xs font-bold text-white">
                    {selectedPacket.length} bytes
                  </div>
                </div>

              </div>

            </div>

            {/* Ethernet */}
            <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4">

              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />

                <h4 className="text-[9px] font-black uppercase tracking-wider text-sky-400">
                  Ethernet
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Source MAC
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-sky-300">
                    {selectedPacket.sourceMac || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Destination MAC
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-sky-300">
                    {selectedPacket.destinationMac || "—"}
                  </div>
                </div>

              </div>

            </div>

            {/* Network */}
            <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4">

              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />

                <h4 className="text-[9px] font-black uppercase tracking-wider text-amber-400">
                  Network
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    IPv4 Source
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-sky-300">
                    {selectedPacket.ipv4Source || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    IPv4 Destination
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-amber-300">
                    {selectedPacket.ipv4Destination || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    IPv6 Source
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-sky-300">
                    {selectedPacket.ipv6Source || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    IPv6 Destination
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-amber-300">
                    {selectedPacket.ipv6Destination || "—"}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    IP Protocol
                  </div>

                  <div className="mt-1 font-mono text-xs text-white">
                    {selectedPacket.ipProtocol || "—"}
                  </div>
                </div>

              </div>

            </div>

            {/* Transport */}
            <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/70 p-4">

              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />

                <h4 className="text-[9px] font-black uppercase tracking-wider text-purple-400">
                  Transport
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Source
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-sky-300">
                    {selectedPacket.source || "—"}
                    {selectedPacket.sourcePort
                      ? `:${selectedPacket.sourcePort}`
                      : ""}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Destination
                  </div>

                  <div className="mt-1 break-all font-mono text-xs text-amber-300">
                    {selectedPacket.destination || "—"}
                    {selectedPacket.destinationPort
                      ? `:${selectedPacket.destinationPort}`
                      : ""}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Ports
                  </div>

                  <div className="mt-1 font-mono text-xs text-white">
                    {selectedPacket.sourcePort ||
                    selectedPacket.destinationPort
                      ? `${selectedPacket.sourcePort || "—"} → ${selectedPacket.destinationPort || "—"}`
                      : "—"}
                  </div>
                </div>

              </div>

            </div>

            {/* Application */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">

              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <h4 className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                  Application
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Protocol
                  </div>

                  <div className="mt-1 text-xs font-bold text-emerald-300">
                    {selectedPacket.protocol || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-600">
                    Packet Information
                  </div>

                  <div className="mt-1 break-all font-mono text-[10px] leading-relaxed text-slate-300">
                    {selectedPacket.info || "—"}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}


      {/* ========================================================
          PCAP ANALYSIS CENTER
          ======================================================== */}
      <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5 shadow-xl">

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-cyan-400" />

              <h2 className="text-lg font-semibold text-white">
                PCAP Analysis Center
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Analyze an existing PCAP or PCAPNG file directly through TShark.
              Results are generated from the actual capture file.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity className="h-4 w-4" />
            TShark-backed analysis
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
              PCAP / PCAPNG file
            </label>

            <input
              value={pcapFile}
              onChange={(event) =>
                setPcapFile(event.target.value)
              }
              placeholder="/tmp/cyberlab-tshark-test.pcapng"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={analyzePcap}
              disabled={
                pcapLoading ||
                !pcapFile.trim()
              }
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pcapLoading ? (
                <Activity className="h-4 w-4 animate-pulse" />
              ) : (
                <FileSearch className="h-4 w-4" />
              )}

              {pcapLoading
                ? "Analyzing..."
                : "Analyze PCAP"}
            </button>
          </div>
        </div>

        {pcapAnalysis && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Packets
                </div>

                <div className="mt-2 text-2xl font-bold text-white">
                  {pcapAnalysis.packetCount.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Capture Size
                </div>

                <div className="mt-2 text-2xl font-bold text-white">
                  {formatBytes(
                    pcapAnalysis.totalBytes
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Duration
                </div>

                <div className="mt-2 text-2xl font-bold text-white">
                  {formatPcapDuration(
                    pcapAnalysis.durationSeconds
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  First Packet
                </div>

                <div className="mt-2 truncate text-sm font-medium text-white">
                  {pcapAnalysis.firstPacketTime ||
                    "—"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Last Packet
                </div>

                <div className="mt-2 truncate text-sm font-medium text-white">
                  {pcapAnalysis.lastPacketTime ||
                    "—"}
                </div>
              </div>

            </div>

            <div className="mt-5 border-b border-slate-800">
              <div className="flex flex-wrap gap-2">

                {[
                  [
                    "overview",
                    "Protocol Hierarchy",
                  ],
                  [
                    "explorer",
                    "Packet Explorer",
                  ],
                  [
                    "endpoints",
                    "Endpoints",
                  ],
                  [
                    "conversations",
                    "Conversations",
                  ],
                  [
                    "expert",
                    "Expert Information",
                  ],
                ].map(([value, label]) => (

                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPcapSection(
                        value as
                          | "overview"
                          | "explorer"
                          | "endpoints"
                          | "conversations"
                          | "expert"
                      )
                    }
                    className={`rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                      pcapSection === value
                        ? "border-b-2 border-cyan-400 text-cyan-300"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>

                ))}

              </div>
            </div>

            <div className="mt-5">

              {pcapSection === "overview" && (
                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">

                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">

                    <div className="border-b border-slate-800 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <BarChart3 className="h-4 w-4 text-cyan-400" />
                        Protocol Hierarchy
                      </div>
                    </div>

                    <div className="max-h-80 overflow-auto">
                      <table className="w-full text-left text-sm">

                        <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">
                              Protocol
                            </th>

                            <th className="px-4 py-3 text-right">
                              Packets
                            </th>

                            <th className="px-4 py-3 text-right">
                              Bytes
                            </th>
                          </tr>
                        </thead>

                        <tbody>

                          {pcapAnalysis.protocolHierarchy.map(
                            (item) => (
                              <tr
                                key={item.protocol}
                                className="border-t border-slate-800"
                              >
                                <td className="px-4 py-3 font-medium text-white">
                                  {item.protocol}
                                </td>

                                <td className="px-4 py-3 text-right text-slate-300">
                                  {item.packets.toLocaleString()}
                                </td>

                                <td className="px-4 py-3 text-right text-slate-300">
                                  {formatBytes(
                                    item.bytes
                                  )}
                                </td>
                              </tr>
                            )
                          )}

                          {pcapAnalysis
                            .protocolHierarchy
                            .length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-4 py-8 text-center text-slate-500"
                              >
                                No protocol hierarchy data
                                returned by TShark.
                              </td>
                            </tr>
                          )}

                        </tbody>

                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">

                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Search className="h-4 w-4 text-cyan-400" />
                      Inspect Individual Packet
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Enter a packet number from this capture.
                      TShark will return the decoded protocol tree
                      for that frame.
                    </p>

                    <div className="mt-4 flex gap-2">

                      <input
                        type="number"
                        min="1"
                        value={pcapPacketNumber}
                        onChange={(event) =>
                          setPcapPacketNumber(
                            event.target.value
                          )
                        }
                        placeholder="Packet #"
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                      />

                      <button
                        type="button"
                        onClick={
                          loadPcapPacketDetail
                        }
                        disabled={pcapLoading}
                        className="rounded-lg border border-cyan-600/60 bg-cyan-600/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-600/20 disabled:opacity-50"
                      >
                        Inspect
                      </button>

                    </div>

                    {pcapPacketDetail && (
                      <div className="mt-4">

                        <div className="mb-2 text-xs text-slate-500">
                          Frame{" "}
                          {pcapPacketDetail.packetNumber}
                          {" · "}
                          {pcapPacketDetail.timestamp}
                        </div>

                        <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-800 bg-black/40 p-3">
                          {renderTSharkProtocolTree(
                            pcapPacketDetail.protocols
                          )}
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              )}

              {pcapSection === "explorer" && (
                <div className="space-y-5">

                  <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">

                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">

                      <div className="border-b border-slate-800 px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <Search className="h-4 w-4 text-cyan-400" />
                          TShark Field Explorer
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Search the field catalogue provided by the installed TShark version
                          and select the fields you want to extract from this capture.
                        </p>
                      </div>

                      <div className="space-y-4 p-4">

                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Search TShark Fields
                          </label>

                          <div className="flex gap-2">

                            <input
                              type="text"
                              value={tsharkFieldSearch}
                              onChange={(event) =>
                                setTsharkFieldSearch(
                                  event.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  loadTSharkFields();
                                }
                              }}
                              placeholder="e.g. tcp.port, ip.src, http.host"
                              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                            />

                            <button
                              type="button"
                              onClick={loadTSharkFields}
                              disabled={tsharkFieldLoading}
                              className="rounded-lg border border-cyan-600/60 bg-cyan-600/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-600/20 disabled:opacity-50"
                            >
                              {tsharkFieldLoading
                                ? "Loading..."
                                : "Search"}
                            </button>

                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3">

                            <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
                              Available Fields
                            </label>

                            <span className="text-[11px] text-slate-600">
                              {tsharkFields.length.toLocaleString()} found
                            </span>

                          </div>

                          <div className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60">

                            {tsharkFields.length === 0 ? (
                              <div className="p-5 text-center text-sm text-slate-600">
                                Search TShark fields to populate this list.
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-800">

                                {tsharkFields.map((field) => {
                                  const selected =
                                    selectedTSharkFields.includes(
                                      field.field
                                    );

                                  return (
                                    <button
                                      key={field.field}
                                      type="button"
                                      onClick={() =>
                                        toggleTSharkField(
                                          field.field
                                        )
                                      }
                                      className={`w-full px-3 py-2 text-left transition ${
                                        selected
                                          ? "bg-cyan-500/10"
                                          : "hover:bg-slate-900"
                                      }`}
                                    >

                                      <div className="flex items-start gap-3">

                                        <div
                                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                            selected
                                              ? "border-cyan-400 bg-cyan-500/20"
                                              : "border-slate-700"
                                          }`}
                                        >
                                          {selected && (
                                            <span className="text-[10px] font-bold text-cyan-300">
                                              ✓
                                            </span>
                                          )}
                                        </div>

                                        <div className="min-w-0">

                                          <div className="break-all font-mono text-xs text-cyan-300">
                                            {field.field}
                                          </div>

                                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-600">
                                            <span>
                                              {field.displayName || "Unnamed field"}
                                            </span>

                                            {field.type && (
                                              <span>
                                                {field.type}
                                              </span>
                                            )}

                                            {field.protocol && (
                                              <span>
                                                {field.protocol}
                                              </span>
                                            )}
                                          </div>

                                        </div>

                                      </div>

                                    </button>
                                  );
                                })}

                              </div>
                            )}

                          </div>
                        </div>

                      </div>

                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">

                      <div className="border-b border-slate-800 px-4 py-4">

                        <div className="flex items-center justify-between gap-3">

                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                              <Database className="h-4 w-4 text-cyan-400" />
                              Selected Fields
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              These fields will be requested directly from TShark.
                            </p>
                          </div>

                          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-400">
                            {selectedTSharkFields.length} selected
                          </span>

                        </div>

                      </div>

                      <div className="space-y-4 p-4">

                        <div className="min-h-24 rounded-lg border border-slate-800 bg-slate-950/60 p-3">

                          {selectedTSharkFields.length === 0 ? (
                            <div className="flex min-h-16 items-center justify-center text-sm text-slate-600">
                              No fields selected.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">

                              {selectedTSharkFields.map((field) => (
                                <button
                                  key={field}
                                  type="button"
                                  onClick={() =>
                                    removeTSharkField(
                                      field
                                    )
                                  }
                                  title="Remove field"
                                  className="group flex max-w-full items-center gap-2 rounded-lg border border-cyan-700/40 bg-cyan-500/5 px-2.5 py-1.5 text-left hover:border-red-500/50 hover:bg-red-500/5"
                                >
                                  <span className="break-all font-mono text-[11px] text-cyan-300 group-hover:text-red-300">
                                    {field}
                                  </span>

                                  <XCircle className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-red-400" />
                                </button>
                              ))}

                            </div>
                          )}

                        </div>

                        <div>

                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Display Filter
                          </label>

                          <input
                            type="text"
                            value={tsharkFieldFilter}
                            onChange={(event) =>
                              setTsharkFieldFilter(
                                event.target.value
                              )
                            }
                            placeholder="Optional TShark display filter, e.g. tcp.port == 22"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-500"
                          />

                          <p className="mt-2 text-[11px] text-slate-600">
                            This is passed to TShark as a display filter. It is not a simulated frontend filter.
                          </p>

                        </div>

                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            onClick={
                              extractTSharkFieldsFromPcap
                            }
                            disabled={
                              tsharkExtractionLoading ||
                              selectedTSharkFields.length === 0
                            }
                            className="rounded-lg border border-cyan-600/60 bg-cyan-600/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {tsharkExtractionLoading
                              ? "Extracting..."
                              : "Extract Fields"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              clearTSharkExtraction
                            }
                            disabled={
                              !tsharkExtraction
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Clear Results
                          </button>

                        </div>

                      </div>

                    </div>

                  </div>

                  {tsharkExtraction && (
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">

                      <div className="border-b border-slate-800 px-4 py-4">

                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <div>
                            <div className="text-sm font-semibold text-white">
                              Extraction Results
                            </div>

                            <div className="mt-1 break-all text-xs text-slate-500">
                              {tsharkExtraction.file}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">

                            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                              {tsharkExtraction.count.toLocaleString()} packets
                            </span>

                            {tsharkExtraction.displayFilter && (
                              <span className="max-w-xs truncate rounded-full border border-cyan-800/40 bg-cyan-500/5 px-3 py-1 font-mono text-[10px] text-cyan-300">
                                {tsharkExtraction.displayFilter}
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                      {tsharkExtraction.rows.length === 0 ? (
                        <div className="p-8 text-center">

                          <div className="text-sm font-medium text-slate-400">
                            TShark returned no matching packets.
                          </div>

                          <p className="mt-1 text-xs text-slate-600">
                            Try removing the display filter or selecting different fields.
                          </p>

                        </div>
                      ) : (
                        <div className="max-h-[34rem] overflow-auto">

                          <table className="w-full min-w-max text-left text-xs">

                            <thead className="sticky top-0 z-10 bg-slate-950">

                              <tr className="border-b border-slate-800">

                                {tsharkExtraction.fields.map(
                                  (field) => (
                                    <th
                                      key={field}
                                      className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-cyan-300"
                                    >
                                      {field}
                                    </th>
                                  )
                                )}

                              </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-800/80">

                              {tsharkExtraction.rows.map(
                                (row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className="hover:bg-slate-950/70"
                                  >

                                    {tsharkExtraction.fields.map(
                                      (field) => (
                                        <td
                                          key={`${rowIndex}-${field}`}
                                          className="max-w-xs whitespace-nowrap px-3 py-2 font-mono text-slate-300"
                                          title={
                                            row?.[field] || ""
                                          }
                                        >
                                          {row?.[field] || "—"}
                                        </td>
                                      )
                                    )}

                                  </tr>
                                )
                              )}

                            </tbody>

                          </table>

                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {(pcapSection === "endpoints" ||
                pcapSection === "conversations" ||
                pcapSection === "expert") && (

                <div className="rounded-xl border border-slate-800 bg-slate-900/60">

                  <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                      <div className="flex items-center gap-2 text-sm font-semibold text-white">

                        {pcapSection === "endpoints" && (
                          <Server className="h-4 w-4 text-cyan-400" />
                        )}

                        {pcapSection === "conversations" && (
                          <Network className="h-4 w-4 text-cyan-400" />
                        )}

                        {pcapSection === "expert" && (
                          <Activity className="h-4 w-4 text-cyan-400" />
                        )}

                        {pcapSection === "endpoints"
                          ? "Endpoints"
                          : pcapSection === "conversations"
                            ? "Conversations"
                            : "Expert Information"}

                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {pcapSection === "expert"
                          ? "Expert information reported by TShark for this capture."
                          : "Search the real TShark output returned for this capture."}
                      </p>

                    </div>

                    <div className="relative w-full lg:w-80">

                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />

                      <input
                        value={pcapSearch}
                        onChange={(event) =>
                          setPcapSearch(
                            event.target.value
                          )
                        }
                        placeholder="Search results..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-500"
                      />

                    </div>

                  </div>

                  {pcapSection === "expert" &&
                  (!pcapExpert ||
                    pcapExpert.rows.length === 0) ? (

                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">

                      <XCircle className="h-10 w-10 text-slate-600" />

                      <div className="mt-3 text-sm font-medium text-slate-300">
                        No expert information detected
                      </div>

                      <div className="mt-1 max-w-md text-xs text-slate-500">
                        TShark returned no expert-information
                        records for this capture.
                      </div>

                    </div>

                  ) : (

                    <div className="max-h-[420px] overflow-auto">

                      {(() => {

                        const rows =
                          pcapSection === "endpoints"
                            ? filteredPcapRows(
                                pcapEndpoints?.rows
                              )
                            : pcapSection ===
                                "conversations"
                              ? filteredPcapRows(
                                  pcapConversations?.rows
                                )
                              : filteredPcapRows(
                                  pcapExpert?.rows
                                );

                        if (rows.length === 0) {
                          return (
                            <div className="px-6 py-10 text-center text-sm text-slate-500">
                              No matching TShark records.
                            </div>
                          );
                        }

                        const columns: string[] =
                          Array.from(
                            new Set(
                              rows.flatMap(
                                (row) =>
                                  Object.keys(row)
                              )
                            )
                          );

                        return (
                          <table className="w-full min-w-max text-left text-sm">

                            <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-500">

                              <tr>

                                {columns.map(
                                  (column) => (
                                    <th
                                      key={column}
                                      className="whitespace-nowrap px-4 py-3"
                                    >
                                      {column}
                                    </th>
                                  )
                                )}

                              </tr>

                            </thead>

                            <tbody>

                              {rows.map(
                                (
                                  row,
                                  rowIndex
                                ) => (

                                  <tr
                                    key={`${pcapSection}-${rowIndex}`}
                                    className="border-t border-slate-800 hover:bg-slate-800/40"
                                  >

                                    {columns.map(
                                      (column) => (
                                        <td
                                          key={column}
                                          className="whitespace-nowrap px-4 py-3 text-slate-300"
                                        >
                                          {row[column] ||
                                            "—"}
                                        </td>
                                      )
                                    )}

                                  </tr>

                                )
                              )}

                            </tbody>

                          </table>
                        );

                      })()}

                    </div>

                  )}

                </div>

              )}

            </div>
          </>
        )}

      </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-950">
              <tr className="border-b border-slate-800 text-[8px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-3">
                  #
                </th>
                <th className="px-3 py-3">
                  Time
                </th>
                <th className="px-3 py-3">
                  Source
                </th>
                <th className="px-3 py-3">
                  Destination
                </th>
                <th className="px-3 py-3">
                  Protocol
                </th>
                <th className="px-3 py-3">
                  Length
                </th>
                <th className="px-3 py-3">
                  Info
                </th>
              </tr>
            </thead>

            <tbody>
              {packets.map((packet) => (
                <tr
                  key={`${packet.number}-${packet.timestamp}`}
                  onClick={() =>
                    setSelectedPacket(packet)
                  }
                  className={`cursor-pointer border-b border-slate-800/60 text-[9px] transition hover:bg-slate-800/40 ${
                    selectedPacket?.number === packet.number
                      ? "bg-emerald-500/10"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-slate-500">
                    {packet.number}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-500">
                    {packet.timestamp}
                  </td>

                  <td className="px-3 py-2 font-mono text-sky-300">
                    {packet.source || "—"}
                    {packet.sourcePort
                      ? `:${packet.sourcePort}`
                      : ""}
                  </td>

                  <td className="px-3 py-2 font-mono text-amber-300">
                    {packet.destination || "—"}
                    {packet.destinationPort
                      ? `:${packet.destinationPort}`
                      : ""}
                  </td>

                  <td className="px-3 py-2 font-bold text-emerald-400">
                    {packet.protocol}
                  </td>

                  <td className="px-3 py-2 font-mono text-slate-400">
                    {packet.length}
                  </td>

                  <td className="max-w-[420px] truncate px-3 py-2 font-mono text-slate-400">
                    {packet.info || "—"}
                  </td>
                </tr>
              ))}

              {packets.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center"
                  >
                    <Activity className="mx-auto mb-3 h-7 w-7 text-slate-700" />

                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      No packets captured
                    </div>

                    <div className="mt-1 text-[9px] text-slate-700">
                      Select an interface and start a capture.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  );
};
