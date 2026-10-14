import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronLeft,
  Circle,
  Globe2,
  Minus,
  Network,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  X,
} from "lucide-react";

interface TopologyNode {
  id: string;
  type: string;
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
  version: string | null;
}

interface TopologyLink {
  id: string;
  source: string;
  target: string;
  source_port_id: number | null;
  target_port_id: number | null;
  protocol: string | null;
  remote_hostname: string | null;
  remote_port: string | null;
  remote_address: string | null;
  active: number | null;
}

interface TopologyVlan {
  id: string;
  device_id: number;
  vlan_id: number | null;
  vlan_vlan: number | null;
  vlan_name: string | null;
}

interface TopologyNetwork {
  id: string;
  family: "ipv4" | "ipv6";
  address: string | null;
  prefix_length: number | null;
  device_id: number;
  port_id: number | null;
}

interface TopologyResponse {
  timestamp: string;
  nodes: TopologyNode[];
  links: TopologyLink[];
  vlans: TopologyVlan[];
  networks: TopologyNetwork[];
  stats: {
    devices: number;
    links: number;
    vlans: number;
    networks: number;
  };
}

interface ObserviumTopologyProps {
  onBack?: () => void;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 116;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 620;

const deviceName = (node: TopologyNode): string =>
  node.sysName || node.hostname || `Device ${node.device_id}`;

const deviceOnline = (node: TopologyNode): boolean =>
  Number(node.status) === 1 &&
  Number(node.disabled) === 0 &&
  String(node.status_type || "").toLowerCase() !== "down";

const formatTime = (value: string | null): string => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatDate = (value: string | null): string => formatTime(value);

const getNodePosition = (index: number, total: number) => {
  if (total <= 1) {
    return {
      x: CANVAS_WIDTH / 2 - NODE_WIDTH / 2,
      y: CANVAS_HEIGHT / 2 - NODE_HEIGHT / 2,
    };
  }

  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const radius = Math.min(260, 110 + total * 32);
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;

  return {
    x: centerX + Math.cos(angle) * radius - NODE_WIDTH / 2,
    y: centerY + Math.sin(angle) * radius - NODE_HEIGHT / 2,
  };
};

const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 py-2 last:border-b-0">
    <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <span className="min-w-0 text-right text-sm text-slate-200">
      {value ?? "—"}
    </span>
  </div>
);

export const ObserviumTopology: React.FC<ObserviumTopologyProps> = ({
  onBack,
}) => {
  const [data, setData] = useState<TopologyResponse | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadTopology = useCallback(async (background = false) => {
    try {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      const response = await fetch(
        "/api/integrations/observium/topology",
        {
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.error ||
            "Unable to retrieve Observium topology."
        );
      }

      const result: TopologyResponse = await response.json();

      setData(result);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("Observium topology error:", err);

      setError(
        err?.message ||
          "Unable to connect to the Observium topology integration."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTopology();

    const timer = window.setInterval(() => {
      void loadTopology(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadTopology]);

  const positions = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {};

    (data?.nodes || []).forEach((node, index, nodes) => {
      result[node.id] = getNodePosition(index, nodes.length);
    });

    return result;
  }, [data?.nodes]);

  const selectedNode = useMemo(
    () =>
      data?.nodes.find(
        (node) => node.id === selectedNodeId
      ) || null,
    [data?.nodes, selectedNodeId]
  );

  const selectedNetworks = useMemo(
    () =>
      data?.networks.filter(
        (network) =>
          network.device_id === selectedNode?.device_id
      ) || [],
    [data?.networks, selectedNode?.device_id]
  );

  const selectedVlans = useMemo(
    () =>
      data?.vlans.filter(
        (vlan) =>
          vlan.device_id === selectedNode?.device_id
      ) || [],
    [data?.vlans, selectedNode?.device_id]
  );

    const selectedPorts = useMemo(
      () =>
        (data?.links || []).filter(
          (link) =>
            link.source === selectedNode?.id ||
            link.target === selectedNode?.id
        ),
      [data?.links, selectedNode?.id]
    );

  const setZoomSafe = (value: number) => {
    setZoom(Math.min(1.8, Math.max(0.55, value)));
  };

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-slate-900/80 px-5 py-4 shadow-xl">
          <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm font-medium">
            Loading network topology…
          </span>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-[calc(100vh-80px)] bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950/95 px-5 py-4">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
              <Network className="h-5 w-5 text-cyan-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold text-white">
                  Network Topology
                </h1>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                  Live
                </span>
              </div>
              <p className="truncate text-xs text-slate-500">
                Observium network discovery and relationship map
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadTopology(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] p-5">
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
            <Activity className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Devices", data?.stats.devices ?? 0, Server],
            ["Links", data?.stats.links ?? 0, Network],
            ["VLANs", data?.stats.vlans ?? 0, Wifi],
            ["Networks", data?.stats.networks ?? 0, Globe2],
          ].map(([label, value, Icon]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {String(label)}
                </span>
                <Icon className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {String(value)}
              </div>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-300">
                Topology Canvas
              </div>
              <div className="mt-0.5 text-[10px] text-slate-600">
                Click a device to inspect it
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomSafe(zoom - 0.1)}
                className="rounded-md border border-slate-700 bg-slate-950 p-1.5 text-slate-400 hover:text-cyan-300"
                title="Zoom out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setZoomSafe(1)}
                className="min-w-[58px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] font-bold text-slate-400 hover:text-cyan-300"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={() => setZoomSafe(zoom + 0.1)}
                className="rounded-md border border-slate-700 bg-slate-950 p-1.5 text-slate-400 hover:text-cyan-300"
                title="Zoom in"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="relative h-[620px] overflow-auto bg-slate-950">
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

            <svg
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              className="relative h-full min-w-full"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 180ms ease",
              }}
            >
              {data?.links.map((link) => {
                const source = positions[link.source];
                const target = positions[link.target];

                if (!source || !target) return null;

                return (
                  <line
                    key={link.id}
                    x1={source.x + NODE_WIDTH / 2}
                    y1={source.y + NODE_HEIGHT / 2}
                    x2={target.x + NODE_WIDTH / 2}
                    y2={target.y + NODE_HEIGHT / 2}
                    stroke="rgba(16,185,129,0.7)"
                    strokeWidth="3"
                  />
                );
              })}

              {data?.nodes.map((node) => {
                const position = positions[node.id];

                if (!position) return null;

                const selected = selectedNodeId === node.id;
                const online = deviceOnline(node);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${position.x},${position.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx="14"
                      fill={
                        selected
                          ? "rgba(8,47,73,0.98)"
                          : "rgba(15,23,42,0.98)"
                      }
                      stroke={
                        selected
                          ? "rgba(34,211,238,0.9)"
                          : online
                            ? "rgba(16,185,129,0.45)"
                            : "rgba(245,158,11,0.45)"
                      }
                      strokeWidth={selected ? "2" : "1"}
                    />

                    <foreignObject
                      x="14"
                      y="15"
                      width="38"
                      height="38"
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-800">
                        <Server
                          size={20}
                          className={
                            online
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }
                        />
                      </div>
                    </foreignObject>

                    <text
                      x="66"
                      y="31"
                      fill="white"
                      fontSize="14"
                      fontWeight="700"
                    >
                      {deviceName(node).slice(0, 20)}
                    </text>

                    <text
                      x="66"
                      y="48"
                      fill="rgba(148,163,184,0.85)"
                      fontSize="10"
                    >
                      {node.type || "device"}
                    </text>

                    <circle
                      cx="24"
                      cy="82"
                      r="4"
                      fill={online ? "#34d399" : "#f59e0b"}
                    />

                    <text
                      x="34"
                      y="86"
                      fill="rgba(148,163,184,0.9)"
                      fontSize="10"
                    >
                      {online ? "Online" : "Attention"}
                    </text>

                    <text
                      x="120"
                      y="86"
                      fill="rgba(100,116,139,0.9)"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {node.ip || node.hostname || "No IP"}
                    </text>

                    <text
                      x="14"
                      y="105"
                      fill="rgba(100,116,139,0.75)"
                      fontSize="8"
                    >
                      {node.location || "Unknown location"}
                    </text>
                  </g>
                );
              })}

              {!data?.nodes.length && (
                <foreignObject
                  x={CANVAS_WIDTH / 2 - 180}
                  y={CANVAS_HEIGHT / 2 - 60}
                  width="360"
                  height="120"
                >
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Server className="h-10 w-10 text-slate-700" />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No Observium devices discovered
                    </p>
                  </div>
                </foreignObject>
              )}
            </svg>

            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-[9px] text-slate-600">
              Observium discovery data
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-[10px] text-slate-600">
            <span>Topology source: Observium</span>
            <span>
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString()}`
                : "Waiting for refresh"}
            </span>
          </div>
        </section>

        {selectedNode && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Server className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Device Inspection
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {deviceName(selectedNode)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="rounded-md border border-slate-700 bg-slate-950 p-1.5 text-slate-500 hover:text-slate-200"
                title="Close device inspection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-3">

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Identity
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <DetailRow label="Hostname" value={selectedNode.hostname} />
                  <DetailRow label="System Name" value={selectedNode.sysName} />
                  <DetailRow label="Type" value={selectedNode.type} />
                  <DetailRow label="OS" value={selectedNode.os} />
                  <DetailRow label="Vendor" value={selectedNode.vendor} />
                  <DetailRow label="Hardware" value={selectedNode.hardware} />
                  <DetailRow label="Location" value={selectedNode.location} />
                  <DetailRow label="Version" value={selectedNode.version} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Network className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Network
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <DetailRow label="Primary IP" value={selectedNode.ip} />
                  <DetailRow
                    label="IPv4 Addresses"
                    value={selectedNetworks
                      .filter((item) => item.family === "ipv4")
                      .map(
                        (item) =>
                          `${item.address}/${item.prefix_length ?? "-"}`
                      )
                      .join(", ")}
                  />
                  <DetailRow
                    label="IPv6 Addresses"
                    value={selectedNetworks
                      .filter((item) => item.family === "ipv6")
                      .map(
                        (item) =>
                          `${item.address}/${item.prefix_length ?? "-"}`
                      )
                      .join(", ")}
                  />
                  <DetailRow
                    label="Ports"
                    value={selectedPorts.length}
                  />
                  <DetailRow
                    label="Links"
                    value={
                      data?.links.filter(
                        (link) =>
                          link.source === selectedNode.id ||
                          link.target === selectedNode.id
                      ).length ?? 0
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-violet-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    VLANs & Status
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <DetailRow
                    label="Status"
                    value={deviceOnline(selectedNode) ? "Online" : "Attention"}
                  />
                  <DetailRow
                    label="VLANs"
                    value={selectedVlans.length}
                  />
                  <DetailRow
                    label="Status Type"
                    value={selectedNode.status_type}
                  />
                  <DetailRow
                    label="Disabled"
                    value={selectedNode.disabled ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Last Polled"
                    value={formatDate(selectedNode.last_polled)}
                  />
                  <DetailRow
                    label="Last Discovered"
                    value={formatDate(selectedNode.last_discovered)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-800 p-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Address Records
                </div>

                {selectedNetworks.length ? (
                  <div className="space-y-1.5">
                    {selectedNetworks.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                      >
                        <span className="font-mono text-[11px] text-slate-300">
                          {item.address}/{item.prefix_length ?? "-"}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-slate-600">
                          {item.family}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 text-xs text-slate-600">
                    No address records.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  VLAN Records
                </div>

                {selectedVlans.length ? (
                  <div className="space-y-1.5">
                    {selectedVlans.map((vlan) => (
                      <div
                        key={vlan.id}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300">
                            {vlan.vlan_name ||
                              vlan.vlan_vlan ||
                              `VLAN ${vlan.vlan_id ?? "-"}`}
                          </span>
                          <span className="text-[9px] text-slate-600">
                            {vlan.vlan_status || "unknown"}
                          </span>
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          VLAN ID {vlan.vlan_id ?? "-"} · Interface{" "}
                          {vlan.ifIndex ?? "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 text-xs text-slate-600">
                    No VLAN records discovered.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
    );
}
