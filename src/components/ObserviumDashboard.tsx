import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ObserviumTopology } from "./ObserviumTopology";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";

interface ObserviumDevice {
  device_id: number;
  hostname: string;
  sysName: string | null;
  label: string | null;
  ip: string | null;
  os: string | null;
  vendor: string | null;
  hardware: string | null;
  location: string | null;
  status: number;
  status_type: string | null;
  disabled: number;
  last_polled: string | null;
  last_discovered: string | null;
}

interface ObserviumPort {
  port_id: number;
  device_id: number;
  port_label: string | null;
  ifDescr: string | null;
  ifName: string | null;
  ifIndex: number | null;
  ifSpeed: number | null;
  ifHighSpeed: number | null;
  ifOperStatus: string | null;
  ifAdminStatus: string | null;
  ifDuplex: string | null;
  ifMtu: number | null;
  ifType: string | null;
  ifAlias: string | null;
  ifPhysAddress: string | null;
  ifInOctets: number | null;
  ifOutOctets: number | null;
  ifInErrors: number | null;
  ifOutErrors: number | null;
  poll_time: number | null;
  poll_period: number | null;
}

interface ObserviumProcessor {
  processor_id?: number;
  processor_descr?: string | null;
  processor_usage?: number | null;
  processor_usage_perc?: number | null;
  processor_value?: number | null;
  [key: string]: unknown;
}

interface ObserviumMemory {
  mempool_id?: number;
  mempool_descr?: string | null;
  mempool_usage?: number | null;
  mempool_perc?: number | null;
  mempool_used?: number | null;
  mempool_free?: number | null;
  [key: string]: unknown;
}

interface ObserviumStorage {
  storage_id?: number;
  storage_descr?: string | null;
  storage_perc?: number | null;
  storage_used?: number | null;
  storage_free?: number | null;
  storage_size?: number | null;
  [key: string]: unknown;
}

interface ObserviumSensor {
  sensor_id?: number;
  sensor_descr?: string | null;
  sensor_type?: string | null;
  sensor_value?: number | null;
  sensor_unit?: string | null;
  sensor_status?: string | null;
  [key: string]: unknown;
}

interface ObserviumDeviceDetailsResponse {
  timestamp: string;
  device: ObserviumDevice;
  ports: ObserviumPort[];
  processors: ObserviumProcessor[];
  memory: ObserviumMemory[];
  storage: ObserviumStorage[];
  sensors: ObserviumSensor[];
}

interface ObserviumDevicesResponse {
  timestamp: string;
  devices: ObserviumDevice[];
}

interface ObserviumOverviewResponse {
  timestamp: string;
  health: "healthy" | "warning" | "critical";
  devices: {
    total: number;
    online: number;
    offline: number;
  };
  interfaces: {
    total: number;
    up: number;
    down: number;
    withErrors: number;
    highUtilization: number;
  };
  alerts: {
    active: number;
  };
}

type ObserviumSnmpVersion = "v1" | "v2c" | "v3";

type ObserviumSnmpSecurityLevel =
  | "noAuthNoPriv"
  | "authNoPriv"
  | "authPriv";

interface ObserviumDeviceForm {
  hostname: string;
  version: ObserviumSnmpVersion;
  port: string;
  transport: string;
  context: string;
  community: string;
  securityLevel: ObserviumSnmpSecurityLevel;
  username: string;
  authPassword: string;
  authAlgorithm: string;
  privacyPassword: string;
  privacyAlgorithm: string;
}

interface ObserviumActionResponse {
  ok: boolean;
  error?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  stdout?: string;
  stderr?: string;
  device?: ObserviumDevice | null;
}

interface ObserviumDashboardProps {
  onBack?: () => void;
}

const formatNumber = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat().format(number);
};

const formatPercent = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toFixed(1)}%`;
};

const formatBytes = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  if (number < 1024) return `${number} B`;

  const units = ["KB", "MB", "GB", "TB", "PB"];
  let size = number;
  let unitIndex = -1;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const formatTimestamp = (value: string | null): string => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const statusIsOnline = (device: ObserviumDevice): boolean => {
  return (
    Number(device.status) === 1 &&
    Number(device.disabled) === 0 &&
    String(device.status_type || "").toLowerCase() !== "down"
  );
};

const createInitialDeviceForm = (): ObserviumDeviceForm => ({
  hostname: "",
  version: "v2c",
  port: "161",
  transport: "udp",
  context: "",
  community: "",
  securityLevel: "authPriv",
  username: "",
  authPassword: "",
  authAlgorithm: "SHA",
  privacyPassword: "",
  privacyAlgorithm: "AES",
});

export const ObserviumDashboard: React.FC<ObserviumDashboardProps> = ({
  onBack,
}) => {
  const [showTopology, setShowTopology] = useState(false);

  const [devices, setDevices] = useState<ObserviumDevice[]>([]);

  const [overview, setOverview] =
  useState<ObserviumOverviewResponse | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(
    null
  );

  const [deviceDetails, setDeviceDetails] =
    useState<ObserviumDeviceDetailsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceForm, setDeviceForm] =
    useState<ObserviumDeviceForm>(createInitialDeviceForm);
  const [deviceActionLoading, setDeviceActionLoading] =
    useState<string | null>(null);
  const [deviceActionMessage, setDeviceActionMessage] =
    useState<string | null>(null);
  const [deviceActionError, setDeviceActionError] =
    useState<string | null>(null);

  const updateDeviceForm = (
    field: keyof ObserviumDeviceForm,
    value: string
  ) => {
    setDeviceForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const managementPayload = () => ({
    hostname: deviceForm.hostname.trim(),
    version: deviceForm.version,
    port: Number(deviceForm.port || 161),
    transport: deviceForm.transport,
    context: deviceForm.context.trim() || undefined,
    community:
      deviceForm.version === "v3"
        ? undefined
        : deviceForm.community,
    securityLevel:
      deviceForm.version === "v3"
        ? deviceForm.securityLevel
        : undefined,
    username:
      deviceForm.version === "v3"
        ? deviceForm.username.trim()
        : undefined,
    authPassword:
      deviceForm.version === "v3"
        ? deviceForm.authPassword
        : undefined,
    authAlgorithm:
      deviceForm.version === "v3"
        ? deviceForm.authAlgorithm
        : undefined,
    privacyPassword:
      deviceForm.version === "v3" &&
      deviceForm.securityLevel === "authPriv"
        ? deviceForm.privacyPassword
        : undefined,
    privacyAlgorithm:
      deviceForm.version === "v3" &&
      deviceForm.securityLevel === "authPriv"
        ? deviceForm.privacyAlgorithm
        : undefined,
  });

  const parseManagementResponse = async (
    response: Response,
    fallback: string
  ): Promise<ObserviumActionResponse> => {
    const data = (await response.json().catch(() => null)) as
      | ObserviumActionResponse
      | null;

    if (!response.ok) {
      throw new Error(data?.error || fallback);
    }

    if (!data) {
      throw new Error(fallback);
    }

    return data;
  };

  const testDeviceConnection = async () => {
    try {
      setDeviceActionLoading("test");
      setDeviceActionMessage(null);
      setDeviceActionError(null);

      const response = await fetch(
        "/api/integrations/observium/devices/test",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(managementPayload()),
        }
      );

      const data = await parseManagementResponse(
        response,
        "Unable to test the Observium SNMP connection."
      );

      if (!data.ok) {
        throw new Error(
          data.error ||
            data.stderr ||
            data.stdout ||
            "Observium SNMP connection test failed."
        );
      }

      setDeviceActionMessage(
        "SNMP connection test succeeded. The device is reachable with the supplied credentials."
      );
    } catch (err: any) {
      console.error("Observium device test error:", err);
      setDeviceActionError(
        err?.message ||
          "Unable to test the Observium SNMP connection."
      );
    } finally {
      setDeviceActionLoading(null);
    }
  };

  const addDevice = async () => {
    try {
      setDeviceActionLoading("add");
      setDeviceActionMessage(null);
      setDeviceActionError(null);

      const response = await fetch(
        "/api/integrations/observium/devices",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(managementPayload()),
        }
      );

      const data = await parseManagementResponse(
        response,
        "Unable to add the Observium device."
      );

      if (!data.ok) {
        throw new Error(
          data.error ||
            data.stderr ||
            data.stdout ||
            "Observium rejected the device."
        );
      }

      setDeviceActionMessage(
        "Device added to Observium successfully."
      );

      setDeviceForm(createInitialDeviceForm());

      await loadDevices();
      await loadOverview();

      window.setTimeout(() => {
        setShowAddDevice(false);
        setDeviceActionMessage(null);
        setDeviceActionError(null);
      }, 900);
    } catch (err: any) {
      console.error("Observium device add error:", err);
      setDeviceActionError(
        err?.message ||
          "Unable to add the Observium device."
      );
    } finally {
      setDeviceActionLoading(null);
    }
  };

  const runDeviceOperation = async (
    deviceId: number,
    operation: "discover" | "poll"
  ) => {
    const actionKey = `${operation}:${deviceId}`;

    try {
      setDeviceActionLoading(actionKey);
      setDeviceActionMessage(null);
      setDeviceActionError(null);

      const response = await fetch(
        `/api/integrations/observium/devices/${deviceId}/${operation}`,
        {
          method: "POST",
        }
      );

      const data = await parseManagementResponse(
        response,
        `Unable to ${operation} the Observium device.`
      );

      if (!data.ok) {
        throw new Error(
          data.error ||
            data.stderr ||
            data.stdout ||
            `Observium ${operation} operation failed.`
        );
      }

      setDeviceActionMessage(
        operation === "discover"
          ? "Observium discovery completed successfully."
          : "Observium poll completed successfully."
      );

      await loadDevices();
      await loadOverview();

      if (selectedDeviceId === deviceId) {
        await loadDeviceDetails(deviceId);
      }
    } catch (err: any) {
      console.error(
        `Observium device ${operation} error:`,
        err
      );

      setDeviceActionError(
        err?.message ||
          `Unable to ${operation} the Observium device.`
      );
    } finally {
      setDeviceActionLoading(null);
    }
  };

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        "/api/integrations/observium/devices"
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.error || "Unable to retrieve Observium devices."
        );
      }

      const data: ObserviumDevicesResponse = await response.json();

      setDevices(data.devices || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("Observium dashboard error:", err);

      setError(
        err?.message || "Unable to connect to the Observium integration."
      );
    } finally {
      setIsLoading(false);
    }
    }, []);

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/integrations/observium/overview"
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.error || "Unable to retrieve Observium network overview."
        );
      }

      const data: ObserviumOverviewResponse = await response.json();

      setOverview(data);
    } catch (err: any) {
      console.error("Observium network overview error:", err);

      setError(
        err?.message ||
          "Unable to retrieve the Observium network overview."
      );
    }
  }, []);

  const loadDeviceDetails = useCallback(async (deviceId: number) => {
    try {
      setIsDetailsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/integrations/observium/devices/${deviceId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.error || "Unable to retrieve device details."
        );
      }

      const data: ObserviumDeviceDetailsResponse = await response.json();

      setDeviceDetails(data);
      setSelectedDeviceId(deviceId);
    } catch (err: any) {
      console.error("Observium device details error:", err);

      setError(
        err?.message || "Unable to retrieve Observium device details."
      );
    } finally {
      setIsDetailsLoading(false);
    }
  }, []);

 useEffect(() => {
  loadDevices();
  loadOverview();
}, [loadDevices, loadOverview]);

  useEffect(() => {
    const interval = setInterval(() => {
  loadDevices();
  loadOverview();

  if (selectedDeviceId !== null) {
    loadDeviceDetails(selectedDeviceId);
  }
}, 15000);

    return () => clearInterval(interval);
  }, [loadDevices, loadDeviceDetails, selectedDeviceId]);

  const onlineDevices = useMemo(
    () => devices.filter(statusIsOnline),
    [devices]
  );

  const offlineDevices = useMemo(
    () => devices.filter((device) => !statusIsOnline(device)),
    [devices]
  );

  const detailProcessorUsage = useMemo(() => {
    if (!deviceDetails?.processors?.length) {
      return null;
    }

    const values = deviceDetails.processors
      .map((processor) => {
        const value =
          processor.processor_usage_perc ??
          processor.processor_usage ??
          processor.processor_value;

        const number = Number(value);

        return Number.isFinite(number) ? number : null;
      })
      .filter((value): value is number => value !== null);

    if (!values.length) {
      return null;
    }

    return (
      values.reduce((total, value) => total + value, 0) / values.length
    );
  }, [deviceDetails]);

  const detailMemoryUsage = useMemo(() => {
    if (!deviceDetails?.memory?.length) {
      return null;
    }

    const values = deviceDetails.memory
      .map((memory) => {
        const value =
          memory.mempool_perc ??
          memory.mempool_usage;

        const number = Number(value);

        return Number.isFinite(number) ? number : null;
      })
      .filter((value): value is number => value !== null);

    if (!values.length) {
      return null;
    }

    return (
      values.reduce((total, value) => total + value, 0) / values.length
    );
  }, [deviceDetails]);

  if (showTopology) {
    return <ObserviumTopology onBack={() => setShowTopology(false)} />;
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  CYBERLAB MONITORING
                </div>

                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-100">
                  Observium Network Monitoring
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">
              Native CyberLab monitoring interface connected directly to
              the Observium monitoring database. View device health,
              interfaces, CPU, memory, storage and live polling state.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setDeviceActionMessage(null);
                setDeviceActionError(null);
                setDeviceForm(createInitialDeviceForm());
                setShowAddDevice(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Device
            </button>

            <button
              type="button"
              onClick={() => setShowTopology(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-sky-400 transition hover:bg-sky-500/20"
            >
              <Network className="h-3.5 w-3.5" />
              Topology
            </button>

            <button
              type="button"
              onClick={() => {
                loadDevices();

                if (selectedDeviceId !== null) {
                  loadDeviceDetails(selectedDeviceId);
                }
              }}
              disabled={isLoading || isDetailsLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isLoading || isDetailsLoading
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3 text-[9px] uppercase tracking-wider text-slate-600">
          <span>
            LAST REFRESH:{" "}
            <span className="font-mono text-slate-400">
              {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}
            </span>
          </span>

          <span className="text-slate-800">•</span>

          <span>
            AUTO REFRESH:{" "}
            <span className="text-emerald-400">15 SEC</span>
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                OBSERVIUM INTEGRATION ERROR
              </div>

              <div className="mt-1 break-words text-xs text-red-300/80">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              NETWORK OVERVIEW
            </div>

            <h2 className="mt-1 text-sm font-bold text-slate-100">
              Infrastructure Health
            </h2>

            <p className="mt-1 text-[10px] text-slate-600">
              Live network status collected from the Observium monitoring
              database.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest ${
              overview?.health === "critical"
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : overview?.health === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : overview?.health === "healthy"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-900 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                overview?.health === "critical"
                  ? "bg-red-400"
                  : overview?.health === "warning"
                  ? "bg-amber-400"
                  : overview?.health === "healthy"
                  ? "bg-emerald-400"
                  : "bg-slate-600"
              }`}
            />

            {overview?.health
              ? overview.health
              : "Loading"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* Devices */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                Devices
              </div>

              <Server className="h-4 w-4 text-slate-500" />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="font-mono text-2xl font-bold text-slate-100">
                {overview ? overview.devices.total : "…"}
              </div>

              <div className="text-right text-[9px] uppercase tracking-wider">
                <div className="text-emerald-400">
                  {overview ? overview.devices.online : "—"} online
                </div>

                <div className="mt-1 text-red-400">
                  {overview ? overview.devices.offline : "—"} offline
                </div>
              </div>
            </div>
          </div>

          {/* Interfaces */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                Interfaces
              </div>

              <Network className="h-4 w-4 text-slate-500" />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="font-mono text-2xl font-bold text-slate-100">
                {overview ? overview.interfaces.total : "…"}
              </div>

              <div className="text-right text-[9px] uppercase tracking-wider">
                <div className="text-emerald-400">
                  {overview ? overview.interfaces.up : "—"} up
                </div>

                <div className="mt-1 text-red-400">
                  {overview ? overview.interfaces.down : "—"} down
                </div>
              </div>
            </div>
          </div>

          {/* Interface Problems */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                Interface Problems
              </div>

              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="font-mono text-2xl font-bold text-slate-100">
                {overview
                  ? overview.interfaces.withErrors +
                    overview.interfaces.highUtilization
                  : "…"}
              </div>

              <div className="text-right text-[9px] uppercase tracking-wider">
                <div className="text-red-400">
                  {overview
                    ? overview.interfaces.withErrors
                    : "—"}{" "}
                  errors
                </div>

                <div className="mt-1 text-amber-400">
                  {overview
                    ? overview.interfaces.highUtilization
                    : "—"}{" "}
                  high util.
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                Active Alerts
              </div>

              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div
                className={`font-mono text-2xl font-bold ${
                  overview?.alerts.active
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {overview ? overview.alerts.active : "…"}
              </div>

              <div className="text-right text-[9px] uppercase tracking-wider">
                <div
                  className={
                    overview?.alerts.active
                      ? "text-red-400"
                      : "text-emerald-400"
                  }
                >
                  {overview?.alerts.active ? "Attention" : "All clear"}
                </div>

                <div className="mt-1 text-slate-600">
                  Observium alerts
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
              Devices
            </div>

            <Server className="h-4 w-4 text-slate-500" />
          </div>

          <div className="mt-2 font-mono text-2xl font-bold text-slate-100">
            {isLoading ? "…" : devices.length}
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
            Monitored infrastructure
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">
              Online
            </div>

            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="mt-2 font-mono text-2xl font-bold text-emerald-400">
            {isLoading ? "…" : onlineDevices.length}
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
            Healthy devices
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-widest text-red-500/70">
              Offline
            </div>

            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>

          <div className="mt-2 font-mono text-2xl font-bold text-red-400">
            {isLoading ? "…" : offlineDevices.length}
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
            Requires attention
          </div>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-widest text-sky-500/70">
              Interfaces
            </div>

            <Network className="h-4 w-4 text-sky-400" />
          </div>

          <div className="mt-2 font-mono text-2xl font-bold text-sky-400">
            {isLoading ? "…" : deviceDetails ? deviceDetails.ports.length : "—"}
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
            Interfaces on selected device
          </div>
        </div>
      </div>

      {/* Device list */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
              MONITORED DEVICES
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Devices discovered and polled by Observium.
            </div>
          </div>

          <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[9px] text-slate-500">
            {devices.length} DEVICES
          </div>
        </div>

        {isLoading && devices.length === 0 ? (
          <div className="flex items-center justify-center gap-3 p-10 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading Observium devices
          </div>
        ) : devices.length === 0 ? (
          <div className="p-10 text-center">
            <Server className="mx-auto h-6 w-6 text-slate-700" />

            <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              No monitored devices
            </div>

            <div className="mt-1 text-xs text-slate-600">
              Observium has not returned any monitored devices.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {devices.map((device) => {
              const online = statusIsOnline(device);

              return (
                <div
                  key={device.device_id}
                  className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        online
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                          : "bg-red-400"
                      }`}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-bold text-slate-200">
                          {device.sysName ||
                            device.label ||
                            device.hostname}
                        </div>

                        <span
                          className={`rounded border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                            online
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-red-500/30 bg-red-500/10 text-red-400"
                          }`}
                        >
                          {online ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>

                      <div className="mt-1 font-mono text-[9px] text-slate-600">
                        {device.hostname}
                        {device.ip ? ` • ${device.ip}` : ""}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {device.os && (
                          <span className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[8px] uppercase tracking-wider text-slate-500">
                            OS: {device.os}
                          </span>
                        )}

                        {device.vendor && (
                          <span className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[8px] uppercase tracking-wider text-slate-500">
                            {device.vendor}
                          </span>
                        )}

                        {device.location && (
                          <span className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[8px] uppercase tracking-wider text-slate-500">
                            {device.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right lg:block">
                      <div className="text-[8px] uppercase tracking-widest text-slate-700">
                        Last polled
                      </div>

                      <div className="mt-1 font-mono text-[9px] text-slate-500">
                        {formatTimestamp(device.last_polled)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        loadDeviceDetails(device.device_id)
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        runDeviceOperation(
                          device.device_id,
                          "discover"
                        )
                      }
                      disabled={
                        deviceActionLoading !== null
                      }
                      className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-sky-400 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deviceActionLoading ===
                      `discover:${device.device_id}`
                        ? "Discovering..."
                        : "Discover"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        runDeviceOperation(
                          device.device_id,
                          "poll"
                        )
                      }
                      disabled={
                        deviceActionLoading !== null
                      }
                      className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-violet-400 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deviceActionLoading ===
                      `poll:${device.device_id}`
                        ? "Polling..."
                        : "Poll"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(deviceActionMessage || deviceActionError) && (
        <div
          className={`rounded-lg border px-4 py-3 text-[10px] ${
            deviceActionError
              ? "border-red-500/20 bg-red-500/5 text-red-300"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
          }`}
        >
          <div className="font-bold uppercase tracking-widest">
            {deviceActionError ? "Observium Action Failed" : "Observium Action"}
          </div>
          <div className="mt-1 leading-5">
            {deviceActionError || deviceActionMessage}
          </div>
        </div>
      )}

      {showAddDevice && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  OBSERVIUM DEVICE MANAGEMENT
                </div>

                <div className="mt-1 text-lg font-bold text-slate-100">
                  Add Monitored Device
                </div>

                <div className="mt-1 text-[10px] leading-5 text-slate-600">
                  Add the device to Observium using its native SNMP configuration.
                  Credentials are sent directly to the CyberLab backend and are
                  never returned to the browser after the operation.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (deviceActionLoading) return;
                  setShowAddDevice(false);
                  setDeviceActionMessage(null);
                  setDeviceActionError(null);
                }}
                disabled={deviceActionLoading !== null}
                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-500 transition hover:border-slate-700 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close add device dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    Hostname / IP Address
                  </span>
                  <input
                    value={deviceForm.hostname}
                    onChange={(event) =>
                      updateDeviceForm(
                        "hostname",
                        event.target.value
                      )
                    }
                    placeholder="192.168.1.1 or switch01.example.local"
                    autoComplete="off"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-emerald-500/50"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    SNMP Version
                  </span>
                  <select
                    value={deviceForm.version}
                    onChange={(event) =>
                      updateDeviceForm(
                        "version",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                  >
                    <option value="v1">SNMP v1</option>
                    <option value="v2c">SNMP v2c</option>
                    <option value="v3">SNMP v3</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    SNMP Port
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={deviceForm.port}
                    onChange={(event) =>
                      updateDeviceForm(
                        "port",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                  />
                </label>

                <label className="block">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    Transport
                  </span>
                  <select
                    value={deviceForm.transport}
                    onChange={(event) =>
                      updateDeviceForm(
                        "transport",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                  >
                    <option value="udp">UDP</option>
                    <option value="udp6">UDP6</option>
                    <option value="tcp">TCP</option>
                    <option value="tcp6">TCP6</option>
                  </select>
                </label>
              </div>

              {deviceForm.version !== "v3" ? (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                    SNMP COMMUNITY
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Community
                      </span>
                      <input
                        type="password"
                        value={deviceForm.community}
                        onChange={(event) =>
                          updateDeviceForm(
                            "community",
                            event.target.value
                          )
                        }
                        autoComplete="new-password"
                        placeholder="SNMP community"
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Context
                      </span>
                      <input
                        value={deviceForm.context}
                        onChange={(event) =>
                          updateDeviceForm(
                            "context",
                            event.target.value
                          )
                        }
                        placeholder="Optional SNMP context"
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                    SNMPV3 SECURITY
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Security Level
                      </span>
                      <select
                        value={deviceForm.securityLevel}
                        onChange={(event) =>
                          updateDeviceForm(
                            "securityLevel",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                      >
                        <option value="noAuthNoPriv">
                          noAuthNoPriv
                        </option>
                        <option value="authNoPriv">
                          authNoPriv
                        </option>
                        <option value="authPriv">
                          authPriv
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Username
                      </span>
                      <input
                        value={deviceForm.username}
                        onChange={(event) =>
                          updateDeviceForm(
                            "username",
                            event.target.value
                          )
                        }
                        autoComplete="off"
                        placeholder="SNMPv3 username"
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                      />
                    </label>
                  </div>

                  {deviceForm.securityLevel !== "noAuthNoPriv" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Authentication Password
                        </span>
                        <input
                          type="password"
                          value={deviceForm.authPassword}
                          onChange={(event) =>
                            updateDeviceForm(
                              "authPassword",
                              event.target.value
                            )
                          }
                          autoComplete="new-password"
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Authentication Algorithm
                        </span>
                        <select
                          value={deviceForm.authAlgorithm}
                          onChange={(event) =>
                            updateDeviceForm(
                              "authAlgorithm",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                        >
                          <option value="MD5">MD5</option>
                          <option value="SHA">SHA</option>
                          <option value="SHA-224">SHA-224</option>
                          <option value="SHA-256">SHA-256</option>
                          <option value="SHA-384">SHA-384</option>
                          <option value="SHA-512">SHA-512</option>
                        </select>
                      </label>
                    </div>
                  )}

                  {deviceForm.securityLevel === "authPriv" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Privacy Password
                        </span>
                        <input
                          type="password"
                          value={deviceForm.privacyPassword}
                          onChange={(event) =>
                            updateDeviceForm(
                              "privacyPassword",
                              event.target.value
                            )
                          }
                          autoComplete="new-password"
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                          Privacy Algorithm
                        </span>
                        <select
                          value={deviceForm.privacyAlgorithm}
                          onChange={(event) =>
                            updateDeviceForm(
                              "privacyAlgorithm",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                        >
                          <option value="DES">DES</option>
                          <option value="AES">AES</option>
                          <option value="AES-192">AES-192</option>
                          <option value="AES-192-C">AES-192-C</option>
                          <option value="AES-256">AES-256</option>
                          <option value="AES-256-C">AES-256-C</option>
                        </select>
                      </label>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      Context
                    </span>
                    <input
                      value={deviceForm.context}
                      onChange={(event) =>
                        updateDeviceForm(
                          "context",
                          event.target.value
                        )
                      }
                      placeholder="Optional SNMP context"
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-200 outline-none focus:border-emerald-500/50"
                    />
                  </label>
                </div>
              )}

              {(deviceActionMessage || deviceActionError) && (
                <div
                  className={`rounded-lg border px-4 py-3 text-[10px] leading-5 ${
                    deviceActionError
                      ? "border-red-500/20 bg-red-500/5 text-red-300"
                      : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                  }`}
                >
                  {deviceActionError || deviceActionMessage}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={testDeviceConnection}
                  disabled={
                    deviceActionLoading !== null ||
                    !deviceForm.hostname.trim()
                  }
                  className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-sky-400 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deviceActionLoading === "test"
                    ? "Testing..."
                    : "Test Connection"}
                </button>

                <button
                  type="button"
                  onClick={addDevice}
                  disabled={
                    deviceActionLoading !== null ||
                    !deviceForm.hostname.trim()
                  }
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deviceActionLoading === "add"
                    ? "Adding..."
                    : "Add Device"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device detail panel */}
      {selectedDeviceId !== null && (
        <div className="rounded-xl border border-emerald-500/20 bg-slate-950/80">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                DEVICE TELEMETRY
              </div>

              <div className="mt-1 text-lg font-bold text-slate-100">
                {deviceDetails?.device?.sysName ||
                  deviceDetails?.device?.hostname ||
                  "Loading device"}
              </div>

              <div className="mt-1 font-mono text-[9px] text-slate-600">
                DEVICE ID: {selectedDeviceId}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDeviceId(null);
                setDeviceDetails(null);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-500 transition hover:border-slate-700 hover:text-slate-200"
              aria-label="Close device details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isDetailsLoading && !deviceDetails ? (
            <div className="flex items-center justify-center gap-3 p-10 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading device telemetry
            </div>
          ) : deviceDetails ? (
            <div className="space-y-5 p-5">
              {/* Device metadata */}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Hostname
                  </div>

                  <div className="mt-2 break-all font-mono text-[10px] text-slate-300">
                    {deviceDetails.device.hostname || "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    IP Address
                  </div>

                  <div className="mt-2 break-all font-mono text-[10px] text-slate-300">
                    {deviceDetails.device.ip || "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Operating System
                  </div>

                  <div className="mt-2 font-mono text-[10px] text-slate-300">
                    {deviceDetails.device.os || "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Hardware
                  </div>

                  <div className="mt-2 break-all font-mono text-[10px] text-slate-300">
                    {deviceDetails.device.hardware || "—"}
                  </div>
                </div>
              </div>

              {/* Telemetry summary */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                      CPU
                    </div>

                    <Cpu className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div className="mt-2 font-mono text-xl font-bold text-slate-200">
                    {formatPercent(detailProcessorUsage)}
                  </div>

                  <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">
                    Average processor usage
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                      Memory
                    </div>

                    <MemoryStick className="h-4 w-4 text-sky-400" />
                  </div>

                  <div className="mt-2 font-mono text-xl font-bold text-slate-200">
                    {formatPercent(detailMemoryUsage)}
                  </div>

                  <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">
                    Average memory usage
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                      Interfaces
                    </div>

                    <Network className="h-4 w-4 text-violet-400" />
                  </div>

                  <div className="mt-2 font-mono text-xl font-bold text-slate-200">
                    {deviceDetails.ports.length}
                  </div>

                  <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">
                    Monitored ports
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                      Storage
                    </div>

                    <HardDrive className="h-4 w-4 text-amber-400" />
                  </div>

                  <div className="mt-2 font-mono text-xl font-bold text-slate-200">
                    {deviceDetails.storage.length}
                  </div>

                  <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-600">
                    Monitored storage pools
                  </div>
                </div>
              </div>

              {/* Interfaces */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                      NETWORK INTERFACES
                    </div>

                    <div className="mt-1 text-[10px] text-slate-600">
                      Live interface state and traffic counters.
                    </div>
                  </div>

                  <Wifi className="h-4 w-4 text-slate-600" />
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full min-w-[800px] text-left">
                    <thead className="bg-slate-900">
                      <tr className="border-b border-slate-800">
                        <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">
                          Interface
                        </th>

                        <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">
                          Admin
                        </th>

                        <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">
                          Operational
                        </th>

                        <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">
                          In
                        </th>

                        <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">
                          Out
                        </th>

                        <th className="px-3 py-2 text-[8px] font-bold uppercase tracking-widest text-slate-600">
                          Errors
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                      {deviceDetails.ports.map((port) => {
                        const interfaceName =
                          port.ifName ||
                          port.ifDescr ||
                          port.port_label ||
                          `Port ${port.ifIndex ?? port.port_id}`;

                        const operational =
                          String(
                            port.ifOperStatus || ""
                          ).toLowerCase() === "up";

                        return (
                          <tr
                            key={port.port_id}
                            className="bg-slate-950/40 hover:bg-slate-900/50"
                          >
                            <td className="px-3 py-3">
                              <div className="font-mono text-[10px] font-bold text-slate-300">
                                {interfaceName}
                              </div>

                              {port.ifAlias && (
                                <div className="mt-1 text-[8px] text-slate-600">
                                  {port.ifAlias}
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 font-mono text-[9px] text-slate-500">
                              {port.ifAdminStatus || "—"}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`rounded border px-2 py-1 text-[8px] font-bold uppercase ${
                                  operational
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : "border-red-500/30 bg-red-500/10 text-red-400"
                                }`}
                              >
                                {port.ifOperStatus || "unknown"}
                              </span>
                            </td>

                            <td className="px-3 py-3 font-mono text-[9px] text-slate-400">
                              {formatBytes(port.ifInOctets)}
                            </td>

                            <td className="px-3 py-3 font-mono text-[9px] text-slate-400">
                              {formatBytes(port.ifOutOctets)}
                            </td>

                            <td className="px-3 py-3 font-mono text-[9px] text-slate-400">
                              {formatNumber(
                                Number(port.ifInErrors || 0) +
                                  Number(port.ifOutErrors || 0)
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CPU / memory / storage */}
              <div className="grid gap-5 xl:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-emerald-400" />

                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      PROCESSORS
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {deviceDetails.processors.length === 0 ? (
                      <div className="text-xs text-slate-600">
                        No processor data.
                      </div>
                    ) : (
                      deviceDetails.processors.map(
                        (processor, index) => (
                          <div
                            key={
                              processor.processor_id ??
                              `processor-${index}`
                            }
                            className="rounded border border-slate-800 bg-slate-950/60 p-3"
                          >
                            <div className="text-[9px] text-slate-500">
                              {processor.processor_descr ||
                                `Processor ${index + 1}`}
                            </div>

                            <div className="mt-1 font-mono text-sm font-bold text-slate-300">
                              {formatPercent(
                                processor.processor_usage_perc ??
                                  processor.processor_usage ??
                                  processor.processor_value
                              )}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="h-4 w-4 text-sky-400" />

                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      MEMORY POOLS
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {deviceDetails.memory.length === 0 ? (
                      <div className="text-xs text-slate-600">
                        No memory data.
                      </div>
                    ) : (
                      deviceDetails.memory.map((memory, index) => (
                        <div
                          key={
                            memory.mempool_id ??
                            `memory-${index}`
                          }
                          className="rounded border border-slate-800 bg-slate-950/60 p-3"
                        >
                          <div className="text-[9px] text-slate-500">
                            {memory.mempool_descr ||
                              `Memory pool ${index + 1}`}
                          </div>

                          <div className="mt-1 font-mono text-sm font-bold text-slate-300">
                            {formatPercent(
                              memory.mempool_perc ??
                                memory.mempool_usage
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-amber-400" />

                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      STORAGE
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {deviceDetails.storage.length === 0 ? (
                      <div className="text-xs text-slate-600">
                        No storage data.
                      </div>
                    ) : (
                      deviceDetails.storage.map((storage, index) => (
                        <div
                          key={
                            storage.storage_id ??
                            `storage-${index}`
                          }
                          className="rounded border border-slate-800 bg-slate-950/60 p-3"
                        >
                          <div className="text-[9px] text-slate-500">
                            {storage.storage_descr ||
                              `Storage ${index + 1}`}
                          </div>

                          <div className="mt-1 font-mono text-sm font-bold text-slate-300">
                            {formatPercent(
                              storage.storage_perc
                            )}
                          </div>

                          <div className="mt-1 text-[8px] text-slate-700">
                            Used:{" "}
                            {formatBytes(storage.storage_used)}
                            {" • "}
                            Free:{" "}
                            {formatBytes(storage.storage_free)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sensors */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-violet-400" />

                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    SENSORS
                  </div>

                  <span className="ml-auto font-mono text-[9px] text-slate-600">
                    {deviceDetails.sensors.length}
                  </span>
                </div>

                {deviceDetails.sensors.length === 0 ? (
                  <div className="mt-3 text-xs text-slate-600">
                    No sensors are currently exposed by this device.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {deviceDetails.sensors.map((sensor, index) => (
                      <div
                        key={
                          sensor.sensor_id ??
                          `sensor-${index}`
                        }
                        className="rounded border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="text-[9px] text-slate-500">
                          {sensor.sensor_descr ||
                            `Sensor ${index + 1}`}
                        </div>

                        <div className="mt-1 font-mono text-sm font-bold text-slate-300">
                          {formatNumber(sensor.sensor_value)}
                          {sensor.sensor_unit
                            ? ` ${sensor.sensor_unit}`
                            : ""}
                        </div>

                        {sensor.sensor_status && (
                          <div className="mt-1 text-[8px] uppercase tracking-wider text-slate-700">
                            {sensor.sensor_status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Polling metadata */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Last Polled
                  </div>

                  <div className="mt-2 font-mono text-[9px] text-slate-400">
                    {formatTimestamp(
                      deviceDetails.device.last_polled
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Last Discovered
                  </div>

                  <div className="mt-2 font-mono text-[9px] text-slate-400">
                    {formatTimestamp(
                      deviceDetails.device.last_discovered
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    Observium Status
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        statusIsOnline(deviceDetails.device)
                          ? "bg-emerald-400"
                          : "bg-red-400"
                      }`}
                    />

                    <span className="font-mono text-[9px] uppercase text-slate-400">
                      {deviceDetails.device.status_type ||
                        "unknown"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-600">
              Select a device to load telemetry.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
