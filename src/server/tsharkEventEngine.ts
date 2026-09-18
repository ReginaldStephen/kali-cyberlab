import type {
  CyberLabEvent,
  CyberLabEventSeverity,
} from "../types";

import type { TSharkPacket } from "./tshark";

export type TSharkEventEmitter = (
  event: Omit<CyberLabEvent, "id" | "timestamp">
) => void;

interface TSharkDetection {
  type: string;
  severity: CyberLabEventSeverity;
  title: string;
  message: string;
}

function getPacketTarget(packet: TSharkPacket): string {
  if (packet.source && packet.destination) {
    return `${packet.source} → ${packet.destination}`;
  }

  if (packet.source) {
    return packet.source;
  }

  if (packet.destination) {
    return packet.destination;
  }

  return packet.protocol || "unknown";
}

function getPacketPortSummary(packet: TSharkPacket): string {
  if (
    packet.sourcePort !== undefined &&
    packet.destinationPort !== undefined
  ) {
    return ` ${packet.sourcePort} → ${packet.destinationPort}`;
  }

  if (packet.sourcePort !== undefined) {
    return ` source port ${packet.sourcePort}`;
  }

  if (packet.destinationPort !== undefined) {
    return ` destination port ${packet.destinationPort}`;
  }

  return "";
}

function detectTSharkEvents(
  packet: TSharkPacket
): TSharkDetection[] {
  const detections: TSharkDetection[] = [];
  const target = getPacketTarget(packet);
  const ports = getPacketPortSummary(packet);

  if (packet.tcpFastRetransmission) {
    detections.push({
      type: "tshark.tcp.fast_retransmission",
      severity: "medium",
      title: "TCP fast retransmission detected",
      message:
        `TShark detected a suspected TCP fast retransmission ` +
        `between ${target}${ports}.`,
    });
  }

  if (packet.tcpRetransmission) {
    detections.push({
      type: "tshark.tcp.retransmission",
      severity: "medium",
      title: "TCP retransmission detected",
      message:
        `TShark detected a suspected TCP retransmission ` +
        `between ${target}${ports}.`,
    });
  }

  if (packet.tcpOutOfOrder) {
    detections.push({
      type: "tshark.tcp.out_of_order",
      severity: "low",
      title: "TCP out-of-order segment detected",
      message:
        `TShark detected an out-of-order TCP segment ` +
        `between ${target}${ports}.`,
    });
  }

  if (packet.tcpLostSegment) {
    detections.push({
      type: "tshark.tcp.lost_segment",
      severity: "medium",
      title: "TCP lost segment detected",
      message:
        `TShark detected a missing TCP segment ` +
        `between ${target}${ports}.`,
    });
  }

  if (packet.tcpZeroWindow) {
    detections.push({
      type: "tshark.tcp.zero_window",
      severity: "medium",
      title: "TCP zero window detected",
      message:
        `TShark detected a TCP zero-window condition ` +
        `between ${target}${ports}.`,
    });
  }

  return detections;
}

export function processTSharkPacket(
  packet: TSharkPacket,
  emitEvent: TSharkEventEmitter
): number {
  const detections = detectTSharkEvents(packet);

  for (const detection of detections) {
    emitEvent({
      type: detection.type,
      source: "TShark",
      severity: detection.severity,
      title: detection.title,
      message: detection.message,
      target: targetFromPacket(packet),
      metadata: {
        packetNumber: packet.number,
        timestamp: packet.timestamp,
        source: packet.source,
        destination: packet.destination,
        sourceMac: packet.sourceMac,
        destinationMac: packet.destinationMac,
        ipv4Source: packet.ipv4Source,
        ipv4Destination: packet.ipv4Destination,
        ipv6Source: packet.ipv6Source,
        ipv6Destination: packet.ipv6Destination,
        ipProtocol: packet.ipProtocol,
        protocol: packet.protocol,
        sourcePort: packet.sourcePort ?? null,
        destinationPort:
          packet.destinationPort ?? null,
        length: packet.length,
        info: packet.info,
        tcpAnalysisFlags:
          packet.tcpAnalysisFlags,
        tcpRetransmission:
          packet.tcpRetransmission,
        tcpFastRetransmission:
          packet.tcpFastRetransmission,
        tcpOutOfOrder:
          packet.tcpOutOfOrder,
        tcpLostSegment:
          packet.tcpLostSegment,
        tcpZeroWindow:
          packet.tcpZeroWindow,
      },
    });
  }

  return detections.length;
}

function targetFromPacket(packet: TSharkPacket): string {
  return getPacketTarget(packet);
}
