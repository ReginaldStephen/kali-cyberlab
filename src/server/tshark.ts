import { spawn, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import {
  processTSharkPacket,
  type TSharkEventEmitter,
} from "./tsharkEventEngine";

const execFileAsync = promisify(execFile);

export interface TSharkPacket {
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
  tcpAnalysisFlags: boolean;
  tcpRetransmission: boolean;
  tcpFastRetransmission: boolean;
  tcpOutOfOrder: boolean;
  tcpLostSegment: boolean;
  tcpZeroWindow: boolean;
}


export interface TSharkProtocol {
  name: string;
  shortName: string;
  filterName: string;
  description: string;
}

export interface TSharkField {
  type: string;
  field: string;
  displayName: string;
  protocol: string;
  parent: string;
}

export interface TSharkPacketDetail {
  packetNumber: number;
  timestamp: string;
  protocols: Record<string, unknown>;
  raw: Record<string, string>;
}

export interface TSharkCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TSharkPcapAnalysis {
  file: string;
  packetCount: number;
  firstPacketTime: string;
  lastPacketTime: string;
  durationSeconds: number;
  totalBytes: number;
  protocolHierarchy: Array<{
    protocol: string;
    packets: number;
    bytes: number;
  }>;
}

export interface TSharkInterface {
  id: string;
  name: string;
}

interface CaptureState {
  running: boolean;
  interface: string;
  captureFilter: string;
  displayFilter: string;
  startedAt: string | null;
  stoppedAt: string | null;
  packetCount: number;
  packets: TSharkPacket[];
  pid: number | null;
  error: string | null;

  durationSeconds: number | null;
  snapshotLength: number | null;
  bufferSizeMb: number | null;
  promiscuous: boolean;
  monitorMode: boolean;

  captureFile: string | null;
  ringBuffer: {
    enabled: boolean;
    fileSizeMb: number | null;
    fileCount: number | null;
    durationSeconds: number | null;
  };
}

const MAX_PACKET_HISTORY = 5000;

const TSHARK_CAPTURE_DIR = path.resolve(
  process.cwd(),
  "data",
  "tshark-captures"
);

const MAX_CAPTURE_DURATION_SECONDS = 3600;
const MAX_SNAPSHOT_LENGTH = 65535;
const MAX_BUFFER_SIZE_MB = 64;
const MAX_RING_FILE_SIZE_MB = 100;
const MAX_RING_FILE_COUNT = 20;

let captureProcess: ReturnType<typeof spawn> | null = null;

function ensureTSharkCaptureDirectory(): void {
  fs.mkdirSync(TSHARK_CAPTURE_DIR, {
    recursive: true,
  });
}

function createTSharkCapturePath(): string {
  ensureTSharkCaptureDirectory();

  const timestamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  return path.join(
    TSHARK_CAPTURE_DIR,
    `capture-${timestamp}.pcapng`
  );
}

const captureState: CaptureState = {
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

  durationSeconds: null,
  snapshotLength: null,
  bufferSizeMb: null,
  promiscuous: true,
  monitorMode: false,

  captureFile: null,
  ringBuffer: {
    enabled: false,
    fileSizeMb: null,
    fileCount: null,
    durationSeconds: null,
  },
};

function parsePacket(line: string): TSharkPacket | null {
  const fields = line.split("\t");

  if (fields.length < 16) {
    return null;
  }

  const [
    frameNumber,
    timestamp,
    ethSrc,
    ethDst,
    ipSrc,
    ipDst,
    ipv6Src,
    ipv6Dst,
    ipProto,
    tcpSrc,
    tcpDst,
    udpSrc,
    udpDst,
    protocol,
    length,
    info,
    tcpAnalysisFlags,
    tcpRetransmission,
    tcpFastRetransmission,
    tcpOutOfOrder,
    tcpLostSegment,
    tcpZeroWindow,
  ] = fields;

  const source = ipSrc || ipv6Src || ethSrc || "";
  const destination = ipDst || ipv6Dst || ethDst || "";

  if (!source && !destination && !protocol) {
    return null;
  }

  const sourcePortText = tcpSrc || udpSrc;
  const destinationPortText = tcpDst || udpDst;

  const sourcePort = sourcePortText
    ? Number(sourcePortText)
    : undefined;

  const destinationPort = destinationPortText
    ? Number(destinationPortText)
    : undefined;

  return {
    number: Number(frameNumber) || 0,
    timestamp,
    source,
    destination,
    sourceMac: ethSrc || "",
    destinationMac: ethDst || "",
    ipv4Source: ipSrc || "",
    ipv4Destination: ipDst || "",
    ipv6Source: ipv6Src || "",
    ipv6Destination: ipv6Dst || "",
    ipProtocol: ipProto || "",
    protocol: protocol || (ipProto ? `IP/${ipProto}` : "Unknown"),
    length: Number(length) || 0,
    sourcePort:
      Number.isFinite(sourcePort) && sourcePort > 0
        ? sourcePort
        : undefined,
    destinationPort:
      Number.isFinite(destinationPort) && destinationPort > 0
        ? destinationPort
        : undefined,
    info: info || "",
    tcpAnalysisFlags: Boolean(tcpAnalysisFlags),
    tcpRetransmission: Boolean(tcpRetransmission),
    tcpFastRetransmission: Boolean(tcpFastRetransmission),
    tcpOutOfOrder: Boolean(tcpOutOfOrder),
    tcpLostSegment: Boolean(tcpLostSegment),
    tcpZeroWindow: Boolean(tcpZeroWindow),
  };
}


function cleanTSharkValue(value: string): string {
  return value
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .trim();
}

function parseTSharkFieldLine(line: string): TSharkField | null {
  /*
   * TShark 4.6.x -G fields output is whitespace-delimited and some
   * columns may be visually merged depending on terminal formatting.
   *
   * Example:
   * F    Source Port    tcp.srcport    FT_UINT16    tcp    BASE_PT_TCP    0x0
   *
   * We therefore identify the actual field name by its protocol-style
   * identifier instead of depending on fixed column positions.
   */
  const trimmed = line.trim();

  if (!/^F\s/.test(trimmed)) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);

  if (tokens.length < 5 || tokens[0] !== "F") {
    return null;
  }

  const fieldIndex = tokens.findIndex(
    (token, index) =>
      index >= 2 &&
      /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_.-]+)+$/.test(token)
  );

  if (fieldIndex === -1) {
    return null;
  }

  const field = cleanTSharkValue(tokens[fieldIndex]);

  if (!field) {
    return null;
  }

  const typeIndex = tokens.findIndex(
    (token, index) =>
      index > fieldIndex &&
      /^FT_[A-Z0-9_]+$/.test(token)
  );

  const type =
    typeIndex !== -1
      ? cleanTSharkValue(tokens[typeIndex])
      : "";

  const protocol =
    field.includes(".")
      ? cleanTSharkValue(field.split(".")[0])
      : "";

  const displayName = cleanTSharkValue(
    tokens.slice(1, fieldIndex).join(" ")
  );

  if (!protocol) {
    return null;
  }

  return {
    type,
    field,
    displayName,
    protocol,
    parent: protocol,
  };
}

function parseProtocolLine(line: string): TSharkProtocol | null {
  const fields = line.split("\t");

  if (fields.length < 3) {
    return null;
  }

  const name = cleanTSharkValue(fields[0] || "");
  const shortName = cleanTSharkValue(fields[1] || "");
  const filterName = cleanTSharkValue(fields[2] || "");

  /*
   * TShark 4.6.x -G protocols output does not provide a
   * human-readable description in column 4. The following
   * columns are protocol metadata flags.
   *
   * Do not expose those flags as a description. CyberLab
   * will use the actual protocol name/filter name instead.
   */
  const description = "";

  if (!shortName && !filterName) {
    return null;
  }

  return {
    name,
    shortName,
    filterName,
    description,
  };
}

async function runTShark(
  args: string[],
  timeout = 30000
): Promise<TSharkCommandResult> {
  try {
    const tsharkBinary = process.env.TSHARK_BINARY || "/usr/bin/tshark";

    const result = await execFileAsync(
      tsharkBinary,
      args,
      {
        timeout,
        maxBuffer: 50 * 1024 * 1024,
      }
    );

    return {
      command: [tsharkBinary, ...args].join(" "),
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: 0,
    };
  } catch (error: any) {
    const tsharkBinary = process.env.TSHARK_BINARY || "/usr/bin/tshark";

    return {
      command: [tsharkBinary, ...args].join(" "),
      stdout: error?.stdout || "",
      stderr: error?.stderr || error?.message || "",
      exitCode:
        typeof error?.code === "number"
          ? error.code
          : 1,
    };
  }
}

export async function getTSharkCapabilities(): Promise<string[]> {
  const result = await runTShark(
    ["-G", "fields"],
    30000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to retrieve TShark field capabilities."
    );
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function getTSharkProtocols(): Promise<TSharkProtocol[]> {
  const result = await runTShark(
    ["-G", "protocols"],
    30000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to retrieve TShark protocols."
    );
  }

  return result.stdout
    .split(/\r?\n/)
    .map(parseProtocolLine)
    .filter(
      (item): item is TSharkProtocol =>
        item !== null
    );
}

export async function getTSharkFields(
  protocol?: string,
  search?: string
): Promise<TSharkField[]> {
  const result = await runTShark(
    ["-G", "fields"],
    30000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to retrieve TShark fields."
    );
  }

  const protocolFilter =
    protocol?.trim().toLowerCase() || "";

  const searchFilter =
    search?.trim().toLowerCase() || "";

  return result.stdout
    .split(/\r?\n/)
    .map(parseTSharkFieldLine)
    .filter(
      (item): item is TSharkField =>
        item !== null
    )
    .filter((item) => {
      if (
        protocolFilter &&
        item.protocol.toLowerCase() !== protocolFilter &&
        !item.field.toLowerCase().startsWith(
          `${protocolFilter}.`
        )
      ) {
        return false;
      }

      if (searchFilter) {
        const haystack = [
          item.field,
          item.displayName,
          item.protocol,
          item.parent,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(searchFilter)) {
          return false;
        }
      }

      return true;
    });
}

export async function getTSharkPacketDetail(
  captureFile: string,
  packetNumber: number
): Promise<TSharkPacketDetail> {
  if (!captureFile?.trim()) {
    throw new Error("A capture file is required.");
  }

  if (
    !Number.isInteger(packetNumber) ||
    packetNumber < 1
  ) {
    throw new Error(
      "A valid packet number is required."
    );
  }

  const result = await runTShark(
    [
      "-r",
      captureFile,
      "-Y",
      `frame.number == ${packetNumber}`,
      "-T",
      "json",
    ],
    30000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to inspect the requested packet."
    );
  }

  let parsed: any;

  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      "TShark returned invalid JSON packet data."
    );
  }

  const packet = Array.isArray(parsed)
    ? parsed[0]
    : null;

  if (!packet) {
    throw new Error(
      `Packet ${packetNumber} was not found.`
    );
  }

  return {
    packetNumber,
    timestamp:
      packet?._source?.layers?.frame?.[
        "frame.time_epoch"
      ] || "",
    protocols:
      packet?._source?.layers || {},
    raw: packet,
  };
}

export async function analyzeTSharkPcap(
  captureFile: string
): Promise<TSharkPcapAnalysis> {
  if (!captureFile?.trim()) {
    throw new Error("A capture file is required.");
  }

  const result = await runTShark(
    [
      "-r",
      captureFile,
      "-T",
      "fields",
      "-E",
      "separator=\t",
      "-E",
      "quote=n",
      "-e",
      "frame.number",
      "-e",
      "frame.time_epoch",
      "-e",
      "frame.len",
      "-e",
      "_ws.col.Protocol",
    ],
    120000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to analyze capture file."
    );
  }

  let packetCount = 0;
  let totalBytes = 0;
  let firstPacketTime = "";
  let lastPacketTime = "";

  const protocolMap = new Map<
    string,
    { packets: number; bytes: number }
  >();

  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const [
      frameNumber,
      timestamp,
      frameLength,
      protocol,
    ] = line.split("\t");

    if (!frameNumber) {
      continue;
    }

    packetCount++;

    const timestampValue =
      Number(timestamp);

    if (!firstPacketTime && timestamp) {
      firstPacketTime = timestamp;
    }

    if (timestamp) {
      lastPacketTime = timestamp;
    }

    const length =
      Number(frameLength) || 0;

    totalBytes += length;

    const protocolName =
      protocol?.trim() || "Unknown";

    const existing =
      protocolMap.get(protocolName) || {
        packets: 0,
        bytes: 0,
      };

    existing.packets++;
    existing.bytes += length;

    protocolMap.set(
      protocolName,
      existing
    );
  }

  const first =
    Number(firstPacketTime) || 0;
  const last =
    Number(lastPacketTime) || 0;

  return {
    file: captureFile,
    packetCount,
    firstPacketTime,
    lastPacketTime,
    durationSeconds:
      first && last && last >= first
        ? last - first
        : 0,
    totalBytes,
    protocolHierarchy: Array.from(
      protocolMap.entries()
    )
      .map(([protocol, values]) => ({
        protocol,
        packets: values.packets,
        bytes: values.bytes,
      }))
      .sort(
        (a, b) =>
          b.packets - a.packets
      ),
  };
}

export async function getTSharkEndpoints(
  captureFile: string,
  protocol?: string
): Promise<Record<string, string>[]> {
  const args = [
    "-r",
    captureFile,
    "-z",
    protocol === "ipv6"
      ? "endpoints,ipv6"
      : "endpoints,ip",
    "-q",
  ];

  const result = await runTShark(
    args,
    120000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to retrieve TShark endpoints."
    );
  }

  const lines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const rows: Record<string, string>[] = [];

  let headerDetected = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("=")) {
      continue;
    }

    if (
      trimmed.includes("IPv4 Endpoints") ||
      trimmed.includes("IPv6 Endpoints")
    ) {
      continue;
    }

    if (
      trimmed.includes("Filter:") ||
      trimmed.includes("Packets") ||
      trimmed.includes("Bytes") ||
      trimmed.includes("Tx Packets") ||
      trimmed.includes("Rx Packets")
    ) {
      headerDetected = true;
      continue;
    }

    if (!headerDetected) {
      continue;
    }

    const tokens = trimmed.split(/\s+/);

    /*
     * TShark 4.6.x endpoint rows are whitespace-delimited:
     *
     * endpoint packets bytes bytes txPackets txBytes bytes rxPackets rxBytes bytes
     *
     * Example:
     * 127.0.0.1 12 1,242 bytes 6 621 bytes 6 621 bytes
     *
     * Do not depend on the visual column alignment because TShark
     * adjusts spacing according to the width of each value.
     */
    if (
      tokens.length < 10 ||
      !/^\d+$/.test(tokens[1]) ||
      tokens[3] !== "bytes" ||
      tokens[6] !== "bytes" ||
      tokens[9] !== "bytes"
    ) {
      continue;
    }

    rows.push({
      endpoint: cleanTSharkValue(tokens[0]),
      packets: cleanTSharkValue(tokens[1]),
      bytes: cleanTSharkValue(tokens[2]),
      txPackets: cleanTSharkValue(tokens[4]),
      txBytes: cleanTSharkValue(tokens[5]),
      rxPackets: cleanTSharkValue(tokens[7]),
      rxBytes: cleanTSharkValue(tokens[8]),
    });
  }

  return rows;
}

export async function getTSharkConversations(
  captureFile: string,
  protocol?: string
): Promise<Record<string, string>[]> {
  const selected =
    protocol?.trim().toLowerCase();

  const table =
    selected === "tcp"
      ? "conv,tcp"
      : selected === "udp"
        ? "conv,udp"
        : selected === "ipv6"
          ? "conv,ipv6"
          : "conv,ip";

  const result = await runTShark(
    [
      "-r",
      captureFile,
      "-z",
      table,
      "-q",
    ],
    120000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to retrieve TShark conversations."
    );
  }

  const lines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const rows: Record<string, string>[] = [];

  let headerDetected = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("=")) {
      continue;
    }

    if (
      trimmed.includes("Conversations") ||
      trimmed.includes("Filter:")
    ) {
      continue;
    }

    if (
      trimmed.includes("Frames") &&
      trimmed.includes("Bytes")
    ) {
      headerDetected = true;
      continue;
    }

    if (!headerDetected) {
      continue;
    }

    const separatorIndex = line.indexOf("<->");

    if (separatorIndex === -1) {
      continue;
    }

    const left = line
      .slice(0, separatorIndex)
      .trim();

    const remainder = line
      .slice(separatorIndex + 3)
      .trim();

    if (!left || !remainder) {
      continue;
    }

    const tokens = remainder.split(/\s+/);

    /*
     * TShark conversation rows are whitespace-delimited
     * after the <-> separator.
     *
     * IP example:
     * 127.0.0.1 <-> 127.0.0.1
     * 0 0 bytes 6 621 bytes 6 621 bytes
     * 0.000000000 0.2637
     *
     * TCP example:
     * 127.0.0.1:37571 <-> 127.0.0.1:52928
     * 3 204 bytes 3 417 bytes 6 621 bytes
     * 0.000000000 0.2637
     */

    if (
      tokens.length < 12 ||
      !/^\d+$/.test(tokens[1]) ||
      tokens[3] !== "bytes" ||
      !/^\d+$/.test(tokens[4]) ||
      tokens[6] !== "bytes" ||
      !/^\d+$/.test(tokens[7]) ||
      tokens[9] !== "bytes"
    ) {
      continue;
    }

    rows.push({
      endpointA: cleanTSharkValue(left),
      endpointB: cleanTSharkValue(tokens[0]),
      reverseFrames: cleanTSharkValue(
        tokens[1]
      ),
      reverseBytes: cleanTSharkValue(
        tokens[2]
      ),
      forwardFrames: cleanTSharkValue(
        tokens[4]
      ),
      forwardBytes: cleanTSharkValue(
        tokens[5]
      ),
      totalFrames: cleanTSharkValue(
        tokens[7]
      ),
      totalBytes: cleanTSharkValue(
        tokens[8]
      ),
      relativeStart: cleanTSharkValue(
        tokens[10]
      ),
      duration: cleanTSharkValue(
        tokens[11]
      ),
    });
  }

  return rows;
}

export async function getTSharkExpertInfo(
  captureFile: string
): Promise<Record<string, string>[]> {
  const result = await runTShark(
    [
      "-r",
      captureFile,
      "-z",
      "expert",
      "-q",
    ],
    120000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to retrieve TShark expert information."
    );
  }

  const lines = result.stdout
    .split(/\\r?\\n/)
    .map((line) => line.trimEnd());

  const rows: Record<string, string>[] = [];

  let headerDetected = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("=")) {
      continue;
    }

    if (
      trimmed.includes("Expert Information") ||
      trimmed.includes("Filter:")
    ) {
      continue;
    }

    /*
     * TShark may return an empty Expert Information table
     * when the capture contains no expert events.
     *
     * When rows are present, the table contains columns such
     * as Group, Severity, Protocol, Summary, and Details.
     */
    if (
      trimmed.includes("Group") &&
      (
        trimmed.includes("Severity") ||
        trimmed.includes("Protocol") ||
        trimmed.includes("Summary")
      )
    ) {
      headerDetected = true;
      continue;
    }

    if (!headerDetected) {
      continue;
    }

    const columns = line
      .split(/\\s{2,}/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (columns.length < 2) {
      continue;
    }

    rows.push({
      group: cleanTSharkValue(columns[0] || ""),
      severity: cleanTSharkValue(columns[1] || ""),
      protocol: cleanTSharkValue(columns[2] || ""),
      summary: cleanTSharkValue(columns[3] || ""),
      details: cleanTSharkValue(columns.slice(4).join(" ") || ""),
    });
  }

  return rows;
}

export async function extractTSharkFields(
  captureFile: string,
  fields: string[],
  displayFilter?: string
): Promise<Record<string, string>[]> {
  const selectedFields = fields
    .map((field) => field.trim())
    .filter(Boolean);

  if (!selectedFields.length) {
    throw new Error(
      "At least one TShark field is required."
    );
  }

  const args = [
    "-r",
    captureFile,
  ];

  if (displayFilter?.trim()) {
    args.push(
      "-Y",
      displayFilter.trim()
    );
  }

  args.push(
    "-T",
    "fields",
    "-E",
    "separator=\t",
    "-E",
    "quote=n",
    "-E",
    "occurrence=a"
  );

  for (const field of selectedFields) {
    args.push("-e", field);
  }

  const result = await runTShark(
    args,
    120000
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "Unable to extract TShark fields."
    );
  }

  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => {
      const values = line.split("\t");

      return Object.fromEntries(
        selectedFields.map(
          (field, index) => [
            field,
            values[index] || "",
          ]
        )
      );
    });
}

export async function getTSharkVersion(): Promise<string> {
  const tsharkBinary =
    process.env.TSHARK_BINARY || "/usr/bin/tshark";

  const { stdout } = await execFileAsync(
    tsharkBinary,
    ["--version"],
    {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    }
  );

  const firstLine = stdout
    .split(/\r?\n/)
    .find((line) => line.trim());

  return firstLine?.trim() || "TShark";
}

export async function getTSharkInterfaces(): Promise<TSharkInterface[]> {
  const tsharkBinary =
    process.env.TSHARK_BINARY || "/usr/bin/tshark";

  const { stdout } = await execFileAsync(
    tsharkBinary,
    ["-D"],
    {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    }
  );

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\.\s+(.+)$/);

      if (!match) {
        return null;
      }

      return {
        id: match[1],
        name: match[2].trim(),
      };
    })
    .filter(
      (item): item is TSharkInterface => item !== null
    );
}

export function getTSharkCaptureState(): CaptureState {
  return {
    running: captureState.running,
    interface: captureState.interface,
    captureFilter: captureState.captureFilter,
    displayFilter: captureState.displayFilter,
    startedAt: captureState.startedAt,
    stoppedAt: captureState.stoppedAt,
    packetCount: captureState.packetCount,
    packets: captureState.packets,
    pid: captureState.pid,
    error: captureState.error,
    durationSeconds: captureState.durationSeconds,
    snapshotLength: captureState.snapshotLength,
    bufferSizeMb: captureState.bufferSizeMb,
    promiscuous: captureState.promiscuous,
    monitorMode: captureState.monitorMode,
    captureFile: captureState.captureFile,
    ringBuffer: {
      enabled: captureState.ringBuffer.enabled,
      fileSizeMb: captureState.ringBuffer.fileSizeMb,
      fileCount: captureState.ringBuffer.fileCount,
      durationSeconds:
        captureState.ringBuffer.durationSeconds,
    },
  };
}

function applyDisplayFilter(
  packets: TSharkPacket[],
  displayFilter: string
): TSharkPacket[] {
  const filter = displayFilter.trim().toLowerCase();

  if (!filter) {
    return packets;
  }

  const protocolFilters: Record<string, string> = {
    tcp: "tcp",
    udp: "udp",
    dns: "dns",
    http: "http",
    tls: "tls",
    ssl: "tls",
    icmp: "icmp",
    arp: "arp",
    ssh: "ssh",
    dhcp: "dhcp",
    dhcpv6: "dhcpv6",
  };

  if (protocolFilters[filter]) {
    const protocol = protocolFilters[filter];

    return packets.filter((packet) =>
      packet.protocol.toLowerCase().includes(protocol)
    );
  }

  const ipAddrMatch = filter.match(
    /^(?:ip\.addr|ip6\.addr)\s*==\s*([0-9a-f:.]+)$/i
  );

  if (ipAddrMatch) {
    const address = ipAddrMatch[1];

    return packets.filter(
      (packet) =>
        packet.source === address ||
        packet.destination === address
    );
  }

  const portMatch = filter.match(
    /^(?:tcp|udp)\.port\s*==\s*(\d+)$/
  );

  if (portMatch) {
    const port = Number(portMatch[1]);

    return packets.filter(
      (packet) =>
        packet.sourcePort === port ||
        packet.destinationPort === port
    );
  }

  const hostMatch = filter.match(
    /^host\s+([0-9a-f:.]+)$/i
  );

  if (hostMatch) {
    const host = hostMatch[1];

    return packets.filter(
      (packet) =>
        packet.source === host ||
        packet.destination === host
    );
  }

  return packets.filter((packet) => {
    const searchable = [
      packet.source,
      packet.destination,
      packet.protocol,
      packet.info,
      String(packet.sourcePort || ""),
      String(packet.destinationPort || ""),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(filter);
  });
}

export function getTSharkPackets(options?: {
  displayFilter?: string;
}) {
  const displayFilter =
    options?.displayFilter?.trim() || "";

  return {
    running: captureState.running,
    interface: captureState.interface,
    captureFilter: captureState.captureFilter,
    displayFilter,
    packetCount: captureState.packetCount,
    packets: applyDisplayFilter(
      captureState.packets,
      displayFilter
    ),
  };
}

export function clearTSharkCapture() {
  if (captureState.running) {
    throw new Error(
      "Stop the TShark capture before clearing packets."
    );
  }

  captureState.packetCount = 0;
  captureState.packets = [];
  captureState.startedAt = null;
  captureState.stoppedAt = null;
  captureState.error = null;

  captureState.durationSeconds = null;
  captureState.snapshotLength = null;
  captureState.bufferSizeMb = null;
  captureState.promiscuous = true;
  captureState.monitorMode = false;
  captureState.captureFile = null;
  captureState.ringBuffer = {
    enabled: false,
    fileSizeMb: null,
    fileCount: null,
    durationSeconds: null,
  };

  return getTSharkCaptureState();
}

export function startTSharkCapture(options?: {
  interface?: string;
  count?: number;
  captureFilter?: string;
  durationSeconds?: number;
  snapshotLength?: number;
  bufferSizeMb?: number;
  promiscuous?: boolean;
  monitorMode?: boolean;
  recordPcap?: boolean;
  ringBuffer?: {
    fileSizeMb?: number;
    fileCount?: number;
    durationSeconds?: number;
  };
  emitEvent?: TSharkEventEmitter;
}): CaptureState {
  if (captureState.running) {
    throw new Error("A TShark capture is already running.");
  }

  const interfaceName =
    options?.interface?.trim() || "any";

  const requestedCount =
    options?.count === undefined ||
    options?.count === null ||
    Number.isNaN(Number(options?.count))
      ? null
      : Number(options.count);

  const count =
    requestedCount === null
      ? null
      : Math.min(
          Math.max(
            Math.trunc(requestedCount),
            1
          ),
          5000
        );

  const captureFilter =
    options?.captureFilter?.trim() || "";

  const durationSeconds = Math.min(
    Math.max(
      Number(options?.durationSeconds) || 0,
      0
    ),
    MAX_CAPTURE_DURATION_SECONDS
  );

  const snapshotLength = Math.min(
    Math.max(
      Number(options?.snapshotLength) || 0,
      0
    ),
    MAX_SNAPSHOT_LENGTH
  );

  const bufferSizeMb = Math.min(
    Math.max(
      Number(options?.bufferSizeMb) || 0,
      0
    ),
    MAX_BUFFER_SIZE_MB
  );

  const promiscuous =
    options?.promiscuous !== false;

  const monitorMode =
    options?.monitorMode === true;

  const recordPcap =
    options?.recordPcap === true;

  const ringFileSizeMb = Math.min(
    Math.max(
      Number(options?.ringBuffer?.fileSizeMb) || 0,
      0
    ),
    MAX_RING_FILE_SIZE_MB
  );

  const ringFileCount = Math.min(
    Math.max(
      Number(options?.ringBuffer?.fileCount) || 0,
      0
    ),
    MAX_RING_FILE_COUNT
  );

  const ringDurationSeconds = Math.min(
    Math.max(
      Number(options?.ringBuffer?.durationSeconds) || 0,
      0
    ),
    MAX_CAPTURE_DURATION_SECONDS
  );

  const ringEnabled =
    recordPcap &&
    (
      ringFileSizeMb > 0 ||
      ringFileCount > 0 ||
      ringDurationSeconds > 0
    );

  const captureFile =
    recordPcap
      ? createTSharkCapturePath()
      : null;

  captureState.running = true;
  captureState.interface = interfaceName;
  captureState.captureFilter = captureFilter;
  captureState.displayFilter = "";
  captureState.startedAt = new Date().toISOString();
  captureState.stoppedAt = null;
  captureState.packetCount = 0;
  captureState.packets = [];
  captureState.pid = null;
  captureState.error = null;

  captureState.durationSeconds =
    durationSeconds > 0
      ? durationSeconds
      : null;

  captureState.snapshotLength =
    snapshotLength > 0
      ? snapshotLength
      : null;

  captureState.bufferSizeMb =
    bufferSizeMb > 0
      ? bufferSizeMb
      : null;

  captureState.promiscuous = promiscuous;
  captureState.monitorMode = monitorMode;
  captureState.captureFile = captureFile;

  captureState.ringBuffer = {
    enabled: ringEnabled,
    fileSizeMb:
      ringFileSizeMb > 0
        ? ringFileSizeMb
        : null,
    fileCount:
      ringFileCount > 0
        ? ringFileCount
        : null,
    durationSeconds:
      ringDurationSeconds > 0
        ? ringDurationSeconds
        : null,
  };

  const args = [
    "-i",
    interfaceName,
    "-l",
    "-T",
    "fields",
    "-E",
    "separator=\t",
    "-E",
    "quote=n",
    "-E",
    "occurrence=f",
    "-e",
    "frame.number",
    "-e",
    "frame.time_epoch",
    "-e",
    "eth.src",
    "-e",
    "eth.dst",
    "-e",
    "ip.src",
    "-e",
    "ip.dst",
    "-e",
    "ipv6.src",
    "-e",
    "ipv6.dst",
    "-e",
    "ip.proto",
    "-e",
    "tcp.srcport",
    "-e",
    "tcp.dstport",
    "-e",
    "udp.srcport",
    "-e",
    "udp.dstport",
    "-e",
    "_ws.col.Protocol",
    "-e",
    "frame.len",
    "-e",
    "_ws.col.Info",
    "-e",
    "tcp.analysis.flags",
    "-e",
    "tcp.analysis.retransmission",
    "-e",
    "tcp.analysis.fast_retransmission",
    "-e",
    "tcp.analysis.out_of_order",
    "-e",
    "tcp.analysis.lost_segment",
    "-e",
    "tcp.analysis.zero_window",
  ];

  if (count !== null) {
    args.splice(
      2,
      0,
      "-c",
      String(count),
    );
  }

  if (!promiscuous) {
    args.push("-p");
  }

  if (monitorMode) {
    args.push("-I");
  }

  if (snapshotLength > 0) {
    args.push(
      "-s",
      String(snapshotLength)
    );
  }

  if (bufferSizeMb > 0) {
    args.push(
      "-B",
      String(bufferSizeMb)
    );
  }

  if (durationSeconds > 0) {
    args.push(
      "-a",
      `duration:${durationSeconds}`
    );
  }

  if (captureFilter) {
    args.push("-f", captureFilter);
  }

  if (captureFile) {
    args.push("-w", captureFile);
  }

  if (ringEnabled) {
    if (ringFileSizeMb > 0) {
      args.push(
        "-b",
        `filesize:${ringFileSizeMb * 1024}`
      );
    }

    if (ringFileCount > 0) {
      args.push(
        "-b",
        `files:${ringFileCount}`
      );
    }

    if (ringDurationSeconds > 0) {
      args.push(
        "-b",
        `duration:${ringDurationSeconds}`
      );
    }
  }

  const tsharkBinary =
    process.env.TSHARK_BINARY || "/usr/bin/tshark";

  captureProcess = spawn(tsharkBinary, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  captureState.pid = captureProcess.pid ?? null;

  const emitTSharkEvent = options?.emitEvent;

  const handleCapturedPacket = (packet: TSharkPacket) => {
    captureState.packetCount += 1;
    captureState.packets.unshift(packet);

    if (
      captureState.packets.length >
      MAX_PACKET_HISTORY
    ) {
      captureState.packets.pop();
    }

    if (emitTSharkEvent) {
      processTSharkPacket(
        packet,
        emitTSharkEvent
      );
    }
  };

  let stdoutBuffer = "";

  captureProcess.stdout?.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString();

    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";

    for (const line of lines) {
      const packet = parsePacket(line);

      if (!packet) {
        continue;
      }

      handleCapturedPacket(packet);
    }
  });

  let stderrBuffer = "";

  captureProcess.stderr?.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString();
  });

  captureProcess.on("error", (error) => {
    captureState.error = error.message;
    captureState.running = false;
    captureState.stoppedAt =
      new Date().toISOString();
    captureState.pid = null;
    captureProcess = null;
  });

  captureProcess.on("close", (code, signal) => {
    if (stdoutBuffer.trim()) {
      const packet = parsePacket(stdoutBuffer.trim());

      if (packet) {
        handleCapturedPacket(packet);
      }
    }

    const stderrMessage = stderrBuffer.trim();

    const meaningfulStderr = stderrMessage
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !line.includes("Running as user") &&
          !line.includes("Promiscuous mode not supported") &&
          !/^\d+\s+packets? captured\.?$/i.test(line)
      )
      .join("\n");

    if (code !== 0 && !signal) {
      captureState.error =
        meaningfulStderr ||
        `TShark capture exited with code ${code}.`;
    } else if (signal && signal !== "SIGINT") {
      captureState.error =
        meaningfulStderr ||
        `TShark capture terminated by signal ${signal}.`;
    } else {
      captureState.error = null;
    }

    captureState.running = false;
    captureState.stoppedAt =
      new Date().toISOString();
    captureState.pid = null;
    captureProcess = null;
  });

  return getTSharkCaptureState();
}

export function stopTSharkCapture() {
  if (!captureProcess || !captureState.running) {
    return getTSharkCaptureState();
  }

  captureProcess.kill("SIGINT");

  return getTSharkCaptureState();
}

export function getTSharkStatistics() {
  const packets = captureState.packets;

  const protocols: Record<string, number> = {};
  const sources: Record<string, number> = {};
  const destinations: Record<string, number> = {};
  const ports: Record<string, number> = {};

  let totalBytes = 0;

  for (const packet of packets) {
    totalBytes += packet.length;

    protocols[packet.protocol] =
      (protocols[packet.protocol] || 0) + 1;

    if (packet.source) {
      sources[packet.source] =
        (sources[packet.source] || 0) + 1;
    }

    if (packet.destination) {
      destinations[packet.destination] =
        (destinations[packet.destination] || 0) + 1;
    }

    if (packet.destinationPort) {
      const key = String(packet.destinationPort);

      ports[key] = (ports[key] || 0) + 1;
    }
  }

  const topEntries = (
    values: Record<string, number>
  ) =>
    Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
      }));

  return {
    packetCount: packets.length,
    totalBytes,
    protocols: topEntries(protocols),
    topSources: topEntries(sources),
    topDestinations: topEntries(destinations),
    topPorts: topEntries(ports),
  };
}
