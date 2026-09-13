import type { CyberLabEventSeverity } from "../types";

export type CyberLabAlertPriority =
  | "none"
  | "normal"
  | "important"
  | "immediate";

export interface CyberLabAlertDecision {
  shouldAlert: boolean;
  priority: CyberLabAlertPriority;
  reason: string;
}

const severityRules: Record<
  CyberLabEventSeverity,
  CyberLabAlertDecision
> = {
  critical: {
    shouldAlert: true,
    priority: "immediate",
    reason:
      "Critical security events require immediate attention.",
  },

  high: {
    shouldAlert: true,
    priority: "immediate",
    reason:
      "High-severity security events require immediate attention.",
  },

  medium: {
    shouldAlert: true,
    priority: "important",
    reason:
      "Medium-severity security events should be reviewed by the security operator.",
  },

  low: {
    shouldAlert: false,
    priority: "normal",
    reason:
      "Low-severity events are recorded but do not require an immediate alert.",
  },

  info: {
    shouldAlert: false,
    priority: "none",
    reason:
      "Informational events are recorded for operational visibility.",
  },
};

export function evaluateCyberLabAlert(
  severity: CyberLabEventSeverity,
  eventType?: string
): CyberLabAlertDecision {
  if (
    eventType === "greenbone.scan.completed" &&
    severity === "info"
  ) {
    return {
      shouldAlert: true,
      priority: "important",
      reason:
        "Greenbone scan completion should be reported to the security operator.",
    };
  }

  if (
    eventType === "greenbone.scan.interrupted" ||
    eventType === "greenbone.scan.failed"
  ) {
    return {
      shouldAlert: true,
      priority: "immediate",
      reason:
        "A Greenbone vulnerability scan did not complete successfully.",
    };
  }

  return {
    ...severityRules[severity],
  };
}

export function getCyberLabAlertPriority(
  severity: CyberLabEventSeverity
): CyberLabAlertPriority {
  return severityRules[severity].priority;
}

export function shouldCyberLabAlert(
  severity: CyberLabEventSeverity
): boolean {
  return severityRules[severity].shouldAlert;
}
