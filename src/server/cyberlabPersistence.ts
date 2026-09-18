import type {
  CyberLabAlert,
  CyberLabAlertStatus,
  CyberLabEvent,
} from "../types";

import type { Pool } from "mysql2/promise";

const MAX_EVENTS = 200;
const MAX_ALERTS = 200;

let db: Pool | null = null;

export function initializeCyberLabPersistence(
  pool: Pool
): void {
  db = pool;
}

function requireDb(): Pool {
  if (!db) {
    throw new Error(
      "CyberLab persistence has not been initialized."
    );
  }

  return db;
}

function toMysqlTimestamp(
  isoTimestamp: string
): string {
  return isoTimestamp
    .replace("T", " ")
    .replace("Z", "")
    .slice(0, 19);
}

export async function persistCyberLabEvent(
  event: CyberLabEvent
): Promise<void> {
  const pool = requireDb();

  await pool.execute(
    `
      INSERT INTO cyberlab_events (
        event_id,
        event_timestamp,
        event_type,
        source,
        severity,
        title,
        message,
        target,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        event_timestamp = VALUES(event_timestamp),
        event_type = VALUES(event_type),
        source = VALUES(source),
        severity = VALUES(severity),
        title = VALUES(title),
        message = VALUES(message),
        target = VALUES(target),
        metadata = VALUES(metadata)
    `,
    [
      event.id,
      toMysqlTimestamp(event.timestamp),
      event.type,
      event.source,
      event.severity,
      event.title,
      event.message,
      event.target ?? null,
      event.metadata
        ? JSON.stringify(event.metadata)
        : null,
    ]
  );
}

export async function persistCyberLabAlert(
  alert: CyberLabAlert
): Promise<void> {
  const pool = requireDb();

  await pool.execute(
    `
      INSERT INTO cyberlab_alerts (
        alert_id,
        event_id,
        created_at,
        severity,
        priority,
        status,
        source,
        alert_type,
        title,
        message,
        target,
        acknowledged_at,
        resolved_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        severity = VALUES(severity),
        priority = VALUES(priority),
        status = VALUES(status),
        source = VALUES(source),
        alert_type = VALUES(alert_type),
        title = VALUES(title),
        message = VALUES(message),
        target = VALUES(target),
        acknowledged_at = VALUES(acknowledged_at),
        resolved_at = VALUES(resolved_at)
    `,
    [
      alert.id,
      alert.eventId,
      toMysqlTimestamp(alert.createdAt),
      alert.severity,
      alert.priority,
      alert.status,
      alert.source,
      alert.type,
      alert.title,
      alert.message,
      alert.target ?? null,
      alert.acknowledgedAt
        ? toMysqlTimestamp(alert.acknowledgedAt)
        : null,
      alert.resolvedAt
        ? toMysqlTimestamp(alert.resolvedAt)
        : null,
    ]
  );
}

export async function updatePersistedCyberLabAlertStatus(
  alert: CyberLabAlert
): Promise<void> {
  const pool = requireDb();

  await pool.execute(
    `
      UPDATE cyberlab_alerts
      SET
        status = ?,
        acknowledged_at = ?,
        resolved_at = ?
      WHERE alert_id = ?
    `,
    [
      alert.status,
      alert.acknowledgedAt
        ? toMysqlTimestamp(alert.acknowledgedAt)
        : null,
      alert.resolvedAt
        ? toMysqlTimestamp(alert.resolvedAt)
        : null,
      alert.id,
    ]
  );
}

export async function loadCyberLabEvents(): Promise<
  CyberLabEvent[]
> {
  const pool = requireDb();

  const [rows] = await pool.query(
    `
      SELECT
        event_id,
        event_timestamp,
        event_type,
        source,
        severity,
        title,
        message,
        target,
        metadata
      FROM cyberlab_events
      ORDER BY event_timestamp DESC, id DESC
      LIMIT ?
    `,
    [MAX_EVENTS]
  );

  return (rows as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.event_id),
      timestamp:
        row.event_timestamp instanceof Date
          ? row.event_timestamp.toISOString()
          : new Date(
              String(row.event_timestamp)
            ).toISOString(),
      type: String(row.event_type),
      source: String(row.source),
      severity:
        row.severity as CyberLabEvent["severity"],
      title: String(row.title),
      message: String(row.message),
      target:
        row.target === null ||
        row.target === undefined
          ? undefined
          : String(row.target),
      metadata:
        row.metadata === null ||
        row.metadata === undefined
          ? undefined
          : typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata as Record<
                string,
                unknown
              >,
    })
  );
}

export async function loadCyberLabAlerts(): Promise<
  CyberLabAlert[]
> {
  const pool = requireDb();

  const [rows] = await pool.query(
    `
      SELECT
        alert_id,
        event_id,
        created_at,
        severity,
        priority,
        status,
        source,
        alert_type,
        title,
        message,
        target,
        acknowledged_at,
        resolved_at
      FROM cyberlab_alerts
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [MAX_ALERTS]
  );

  return (rows as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.alert_id),
      eventId: String(row.event_id),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(
              String(row.created_at)
            ).toISOString(),
      severity:
        row.severity as CyberLabAlert["severity"],
      priority:
        row.priority as CyberLabAlert["priority"],
      status:
        row.status as CyberLabAlertStatus,
      source: String(row.source),
      type: String(row.alert_type),
      title: String(row.title),
      message: String(row.message),
      target:
        row.target === null ||
        row.target === undefined
          ? undefined
          : String(row.target),
      acknowledgedAt:
        row.acknowledged_at === null ||
        row.acknowledged_at === undefined
          ? undefined
          : new Date(
              String(row.acknowledged_at)
            ).toISOString(),
      resolvedAt:
        row.resolved_at === null ||
        row.resolved_at === undefined
          ? undefined
          : new Date(
              String(row.resolved_at)
            ).toISOString(),
    })
  );
}
