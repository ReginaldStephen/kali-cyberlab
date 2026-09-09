import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
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

export const ObserviumDashboard: React.FC<ObserviumDashboardProps> = ({
  onBack,
}) => {
  const [devices, setDevices] = useState<ObserviumDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(
    null
  );

  const [deviceDetails, setDeviceDetails] =
    useState<ObserviumDeviceDetailsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
  }, [loadDevices]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDevices();

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
            {isLoading
              ? "…"
              : devices.length === 0
                ? 0
                : "—"}
          </div>

          <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
            Select a device for interface data
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
