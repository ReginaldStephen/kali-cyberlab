import {
  persistCyberLabEvent,
  persistCyberLabAlert,
  updatePersistedCyberLabAlertStatus,
  loadCyberLabAlerts,
} from "./cyberlabPersistence";
import type {
  CyberLabAlert,
  CyberLabAlertStatus,
  CyberLabEvent,
} from "../types";

import {
  evaluateCyberLabAlert,
} from "./alertRules";

import {
  sendCyberLabAlertToTelegram,
} from "./telegram";

const cyberLabAlerts: CyberLabAlert[] = [];

const MAX_ALERTS = 200;

export async function loadPersistedCyberLabAlerts(): Promise<void> {
  try {
    const persistedAlerts = await loadCyberLabAlerts();

    cyberLabAlerts.length = 0;
    cyberLabAlerts.push(...persistedAlerts.slice(0, MAX_ALERTS));

    console.log(
      `[CyberLab Persistence] Loaded ${cyberLabAlerts.length} persisted alert(s).`
    );
  } catch (error) {
    console.error(
      "[CyberLab Persistence] Failed to load persisted alerts:",
      error
    );
  }
}

export function processCyberLabEvent(
  event: CyberLabEvent
): CyberLabAlert | null {

  void persistCyberLabEvent(event).catch((error) => {
    console.error(
      "[CyberLab Persistence] Failed to persist event:",
      error
    );
  });

const decision = evaluateCyberLabAlert(
    event.severity,
    event.type
  );

  if (!decision.shouldAlert) {
    return null;
  }

  const existingAlert = cyberLabAlerts.find(
    (alert) => alert.eventId === event.id
  );

  if (existingAlert) {
    return existingAlert;
  }

  const alert: CyberLabAlert = {
    id: `alert-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    eventId: event.id,
    createdAt: new Date().toISOString(),

    severity: event.severity,
    priority: decision.priority,

    status: "pending",

    source: event.source,
    type: event.type,
    title: event.title,
    message: event.message,

    target: event.target,
  };

  cyberLabAlerts.unshift(alert);

  void persistCyberLabAlert(alert).catch((error) => {
    console.error(
      "[CyberLab Persistence] Failed to persist alert:",
      error
    );
  });

  void sendCyberLabAlertToTelegram(alert).catch(
    (error) => {
      console.error(
        "[Telegram] Alert notification failed:",
        error
      );
    }
  );

  if (cyberLabAlerts.length > MAX_ALERTS) {
    cyberLabAlerts.pop();
  }

  console.log(
    `[CyberLab Alert] ${alert.priority.toUpperCase()} | ` +
      `${alert.severity.toUpperCase()} | ` +
      `${alert.source} | ` +
      `${alert.title}`
  );

  return alert;
}

export function getCyberLabAlerts(
  limit = 50
): CyberLabAlert[] {
  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    MAX_ALERTS
  );

  return cyberLabAlerts.slice(
    0,
    safeLimit
  );
}

export function getPendingCyberLabAlerts(): CyberLabAlert[] {
  return cyberLabAlerts.filter(
    (alert) => alert.status === "pending"
  );
}

export function getCyberLabAlertById(
  alertId: string
): CyberLabAlert | null {
  const normalizedAlertId = alertId.trim();

  if (!normalizedAlertId) {
    return null;
  }

  return (
    cyberLabAlerts.find(
      (alert) => alert.id === normalizedAlertId
    ) || null
  );
}

export function updateCyberLabAlertStatus(
  alertId: string,
  status: CyberLabAlertStatus
): CyberLabAlert | null {
  const alert = cyberLabAlerts.find(
    (item) => item.id === alertId
  );

  if (!alert) {
    return null;
  }

  alert.status = status;

  const now = new Date().toISOString();

  if (status === "acknowledged") {
    alert.acknowledgedAt = now;
  }

  if (status === "resolved") {
    alert.resolvedAt = now;

    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = now;
    }
  }

  void updatePersistedCyberLabAlertStatus(alert).catch((error) => {
    console.error(
      "[CyberLab Persistence] Failed to update alert status:",
      error
    );
  });

  return alert;
}

export function getCyberLabAlertStats() {
  return {
    total: cyberLabAlerts.length,

    pending: cyberLabAlerts.filter(
      (alert) => alert.status === "pending"
    ).length,

    acknowledged: cyberLabAlerts.filter(
      (alert) => alert.status === "acknowledged"
    ).length,

    resolved: cyberLabAlerts.filter(
      (alert) => alert.status === "resolved"
    ).length,

    critical: cyberLabAlerts.filter(
      (alert) => alert.severity === "critical"
    ).length,

    high: cyberLabAlerts.filter(
      (alert) => alert.severity === "high"
    ).length,

    medium: cyberLabAlerts.filter(
      (alert) => alert.severity === "medium"
    ).length,
  };
}
