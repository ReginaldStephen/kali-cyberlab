import crypto from "crypto";
import type { Pool } from "mysql2/promise";

import type {
  WarRoomEvent,
  WarRoomEvidence,
  WarRoomExercise,
  WarRoomExerciseStatus,
  WarRoomPhase,
  WarRoomPhaseStatus,
  WarRoomTargetScope,
} from "../types";

let db: Pool | null = null;

const DEFAULT_PHASES = [
  "reconnaissance",
  "enumeration",
  "initial_access",
  "exploitation",
  "privilege_attempt",
  "persistence_simulation",
  "lateral_movement_simulation",
  "data_access_simulation",
];

function requireDb(): Pool {
  if (!db) {
    throw new Error(
      "War Room persistence has not been initialized."
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

function fromMysqlTimestamp(
  value: unknown
): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const mysqlTimestamp =
    String(value)
      .replace(" ", "T")
      .replace(/Z$/, "");

  return new Date(
    `${mysqlTimestamp}Z`
  ).toISOString();
}

function parseJson<T>(
  value: unknown,
  fallback: T
): T {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapExercise(
  row: Record<string, unknown>
): WarRoomExercise {
  return {
    id: String(row.id),
    name: String(row.name),
    description:
      row.description === null ||
      row.description === undefined
        ? undefined
        : String(row.description),
    scenarioType: String(row.scenario_type),
    difficulty:
      String(row.difficulty) as WarRoomExercise["difficulty"],
    status:
      String(row.status) as WarRoomExerciseStatus,
    targetScope: parseJson<WarRoomTargetScope>(
      row.target_scope,
      {
        targets: [],
        authorized: false,
      }
    ),
    createdBy:
      row.created_by === null ||
      row.created_by === undefined
        ? undefined
        : Number(row.created_by),
    createdAt: fromMysqlTimestamp(
      row.created_at
    ),
    startedAt:
      row.started_at === null ||
      row.started_at === undefined
        ? undefined
        : fromMysqlTimestamp(row.started_at),
    endedAt:
      row.ended_at === null ||
      row.ended_at === undefined
        ? undefined
        : fromMysqlTimestamp(row.ended_at),
    metadata: parseJson<
      Record<string, unknown> | undefined
    >(row.metadata, undefined),
  };
}

function mapPhase(
  row: Record<string, unknown>
): WarRoomPhase {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    phase: String(row.phase),
    sequenceNo: Number(row.sequence_no),
    status:
      String(row.status) as WarRoomPhaseStatus,
    startedAt:
      row.started_at === null ||
      row.started_at === undefined
        ? undefined
        : fromMysqlTimestamp(row.started_at),
    endedAt:
      row.ended_at === null ||
      row.ended_at === undefined
        ? undefined
        : fromMysqlTimestamp(row.ended_at),
    metadata: parseJson<
      Record<string, unknown> | undefined
    >(row.metadata, undefined),
  };
}

function mapEvent(
  row: Record<string, unknown>
): WarRoomEvent {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    timestamp: fromMysqlTimestamp(
      row.timestamp
    ),
    source: String(row.source),
    model:
      row.model === null ||
      row.model === undefined
        ? undefined
        : String(row.model) as WarRoomEvent["model"],
    eventType: String(row.event_type),
    severity:
      row.severity === null ||
      row.severity === undefined
        ? undefined
        : row.severity as WarRoomEvent["severity"],
    title: String(row.title),
    message:
      row.message === null ||
      row.message === undefined
        ? undefined
        : String(row.message),
    target:
      row.target === null ||
      row.target === undefined
        ? undefined
        : String(row.target),
    payload: parseJson<
      Record<string, unknown> | undefined
    >(row.payload, undefined),
  };
}


function mapEvidence(
  row: Record<string, unknown>
): WarRoomEvidence {
  return {
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    findingId:
      row.finding_id === null ||
      row.finding_id === undefined
        ? undefined
        : String(row.finding_id),
    type:
      String(row.type) as WarRoomEvidence["type"],
    title: String(row.title),
    description:
      row.description === null ||
      row.description === undefined
        ? undefined
        : String(row.description),
    source:
      String(row.source) as WarRoomEvidence["source"],
    sourceId:
      row.source_id === null ||
      row.source_id === undefined
        ? undefined
        : String(row.source_id),
    metadata: parseJson<
      Record<string, unknown> | undefined
    >(
      row.metadata,
      undefined
    ),
    content:
      row.content === null ||
      row.content === undefined
        ? undefined
        : String(row.content),
    artifactPath:
      row.artifact_path === null ||
      row.artifact_path === undefined
        ? undefined
        : String(row.artifact_path),
    capturedAt: fromMysqlTimestamp(
      row.captured_at
    ),
    createdAt: fromMysqlTimestamp(
      row.created_at
    ),
  };
}

export function initializeWarRoomPersistence(
  pool: Pool
): void {
  db = pool;
}

export async function createWarRoomExercise(
  input: Omit<
    WarRoomExercise,
    "createdAt" | "status"
  > & {
    status?: WarRoomExerciseStatus;
  }
): Promise<WarRoomExercise> {
  const pool = requireDb();

  if (!input.targetScope.authorized) {
    throw new Error(
      "War Room exercise requires an explicitly authorized target scope."
    );
  }

  const createdAt = new Date().toISOString();
  const status =
    input.status || "draft";

  await pool.execute(
    `
      INSERT INTO war_room_exercises (
        id,
        name,
        description,
        scenario_type,
        difficulty,
        status,
        target_scope,
        created_by,
        created_at,
        started_at,
        ended_at,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.id,
      input.name,
      input.description ?? null,
      input.scenarioType,
      input.difficulty,
      status,
      JSON.stringify(input.targetScope),
      input.createdBy ?? null,
      toMysqlTimestamp(createdAt),
      input.startedAt
        ? toMysqlTimestamp(input.startedAt)
        : null,
      input.endedAt
        ? toMysqlTimestamp(input.endedAt)
        : null,
      input.metadata
        ? JSON.stringify(input.metadata)
        : null,
    ]
  );

  const exercise: WarRoomExercise = {
    ...input,
    status,
    createdAt,
  };

  return exercise;
}

export async function getWarRoomExercise(
  id: string
): Promise<WarRoomExercise | null> {
  const pool = requireDb();

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        description,
        scenario_type,
        difficulty,
        status,
        target_scope,
        created_by,
        created_at,
        started_at,
        ended_at,
        metadata
      FROM war_room_exercises
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  const row = (
    rows as Array<Record<string, unknown>>
  )[0];

  return row ? mapExercise(row) : null;
}

export async function listWarRoomExercises(
  limit = 50
): Promise<WarRoomExercise[]> {
  const pool = requireDb();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  );

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        description,
        scenario_type,
        difficulty,
        status,
        target_scope,
        created_by,
        created_at,
        started_at,
        ended_at,
        metadata
      FROM war_room_exercises
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return (
    rows as Array<Record<string, unknown>>
  ).map(mapExercise);
}

export async function startWarRoomExercise(
  id: string
): Promise<WarRoomExercise> {
  const pool = requireDb();

  const existing =
    await getWarRoomExercise(id);

  if (!existing) {
    throw new Error(
      "War Room exercise not found."
    );
  }

  if (
    existing.status !== "draft" &&
    existing.status !== "paused"
  ) {
    throw new Error(
      `Exercise cannot be started from status "${existing.status}".`
    );
  }

  const now = new Date().toISOString();

  await pool.execute(
    `
      UPDATE war_room_exercises
      SET
        status = 'running',
        started_at = COALESCE(started_at, ?),
        ended_at = NULL
      WHERE id = ?
    `,
    [
      toMysqlTimestamp(now),
      id,
    ]
  );

  const startedPhase =
    await startNextWarRoomPhase(id);

  await addWarRoomEvent({
    id: `event-${crypto.randomUUID()}`,
    exerciseId: id,
    timestamp: now,
    source: "war-room",
    model: "red",
    eventType: "war_room.exercise.started",
    title: "War Room exercise started",
    message: `Exercise "${existing.name}" started.`,
    payload: {
      scenarioType: existing.scenarioType,
      difficulty: existing.difficulty,
      targetScope: existing.targetScope,
    },
  });

  if (startedPhase) {
    await addWarRoomEvent({
      id: `event-${crypto.randomUUID()}`,
      exerciseId: id,
      timestamp: now,
      source: "war-room",
      model: "red",
      eventType: "war_room.phase.started",
      title: "Reconnaissance phase started",
      message: `War Room phase "${startedPhase.phase}" started.`,
      payload: {
        phaseId: startedPhase.id,
        sequenceNo: startedPhase.sequenceNo,
      },
    });
  }

  return (
    await getWarRoomExercise(id)
  ) as WarRoomExercise;
}

export async function pauseWarRoomExercise(
  id: string
): Promise<WarRoomExercise> {
  return updateWarRoomExerciseStatus(
    id,
    "paused"
  );
}

export async function completeWarRoomExercise(
  id: string
): Promise<WarRoomExercise> {
  const pool = requireDb();

  const existing =
    await getWarRoomExercise(id);

  if (!existing) {
    throw new Error(
      "War Room exercise not found."
    );
  }

  if (
    existing.status !== "running" &&
    existing.status !== "paused"
  ) {
    throw new Error(
      `Exercise cannot be completed from status "${existing.status}".`
    );
  }

  const now = new Date().toISOString();

  await pool.execute(
    `
      UPDATE war_room_exercises
      SET
        status = 'completed',
        ended_at = ?
      WHERE id = ?
    `,
    [
      toMysqlTimestamp(now),
      id,
    ]
  );

  await completeActiveWarRoomPhase(id);

  return (
    await getWarRoomExercise(id)
  ) as WarRoomExercise;
}

export async function cancelWarRoomExercise(
  id: string
): Promise<WarRoomExercise> {
  return updateWarRoomExerciseStatus(
    id,
    "cancelled"
  );
}

async function updateWarRoomExerciseStatus(
  id: string,
  status: WarRoomExerciseStatus
): Promise<WarRoomExercise> {
  const pool = requireDb();

  const existing =
    await getWarRoomExercise(id);

  if (!existing) {
    throw new Error(
      "War Room exercise not found."
    );
  }

  if (
    status === "paused" &&
    existing.status !== "running"
  ) {
    throw new Error(
      "Only a running exercise can be paused."
    );
  }

  await pool.execute(
    `
      UPDATE war_room_exercises
      SET status = ?
      WHERE id = ?
    `,
    [status, id]
  );

  return (
    await getWarRoomExercise(id)
  ) as WarRoomExercise;
}

export async function createWarRoomPhases(
  exerciseId: string
): Promise<WarRoomPhase[]> {
  const pool = requireDb();

  const exercise =
    await getWarRoomExercise(exerciseId);

  if (!exercise) {
    throw new Error(
      "War Room exercise not found."
    );
  }

  const phases: WarRoomPhase[] =
    DEFAULT_PHASES.map(
      (phase, index) => ({
        id: `phase-${exerciseId}-${index + 1}`,
        exerciseId,
        phase,
        sequenceNo: index + 1,
        status: "pending" as const,
      })
    );

  for (const phase of phases) {
    await pool.execute(
      `
        INSERT INTO war_room_phases (
          id,
          exercise_id,
          phase,
          sequence_no,
          status,
          started_at,
          ended_at,
          metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          phase = VALUES(phase),
          sequence_no = VALUES(sequence_no)
      `,
      [
        phase.id,
        phase.exerciseId,
        phase.phase,
        phase.sequenceNo,
        phase.status,
        null,
        null,
        null,
      ]
    );
  }

  return listWarRoomPhases(
    exerciseId
  );
}

export async function listWarRoomPhases(
  exerciseId: string
): Promise<WarRoomPhase[]> {
  const pool = requireDb();

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        exercise_id,
        phase,
        sequence_no,
        status,
        started_at,
        ended_at,
        metadata
      FROM war_room_phases
      WHERE exercise_id = ?
      ORDER BY sequence_no ASC
    `,
    [exerciseId]
  );

  return (
    rows as Array<Record<string, unknown>>
  ).map(mapPhase);
}

async function startNextWarRoomPhase(
  exerciseId: string
): Promise<WarRoomPhase | null> {
  const pool = requireDb();

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM war_room_phases
      WHERE exercise_id = ?
        AND status = 'pending'
      ORDER BY sequence_no ASC
      LIMIT 1
    `,
    [exerciseId]
  );

  const row =
    (rows as Array<Record<string, unknown>>)[0];

  if (!row) {
    return null;
  }

  const now = new Date().toISOString();

  await pool.execute(
    `
      UPDATE war_room_phases
      SET
        status = 'running',
        started_at = ?
      WHERE id = ?
    `,
    [
      toMysqlTimestamp(now),
      String(row.id),
    ]
  );

  const [updatedRows] = await pool.execute(
    `
      SELECT *
      FROM war_room_phases
      WHERE id = ?
      LIMIT 1
    `,
    [String(row.id)]
  );

  const updated =
    (updatedRows as Array<Record<string, unknown>>)[0];

  return updated
    ? mapPhase(updated)
    : null;
}

async function completeActiveWarRoomPhase(
  exerciseId: string
): Promise<WarRoomPhase | null> {
  const pool = requireDb();

  const [rows] = await pool.execute(
    `
      SELECT *
      FROM war_room_phases
      WHERE exercise_id = ?
        AND status = 'running'
      ORDER BY sequence_no ASC
      LIMIT 1
    `,
    [exerciseId]
  );

  const row =
    (rows as Array<Record<string, unknown>>)[0];

  if (!row) {
    return null;
  }

  const now = new Date().toISOString();

  await pool.execute(
    `
      UPDATE war_room_phases
      SET
        status = 'completed',
        ended_at = ?
      WHERE id = ?
    `,
    [
      toMysqlTimestamp(now),
      String(row.id),
    ]
  );

  const [updatedRows] = await pool.execute(
    `
      SELECT *
      FROM war_room_phases
      WHERE id = ?
      LIMIT 1
    `,
    [String(row.id)]
  );

  const updated =
    (updatedRows as Array<Record<string, unknown>>)[0];

  return updated
    ? mapPhase(updated)
    : null;
}

export async function transitionWarRoomPhase(
  exerciseId: string
): Promise<{
  completedPhase: WarRoomPhase | null;
  startedPhase: WarRoomPhase | null;
}> {
  const pool = requireDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [runningRows] =
      await connection.execute(
        `
          SELECT *
          FROM war_room_phases
          WHERE exercise_id = ?
            AND status = 'running'
          ORDER BY sequence_no ASC
          LIMIT 1
          FOR UPDATE
        `,
        [exerciseId]
      );

    const runningRow =
      (runningRows as Array<Record<string, unknown>>)[0];

    if (!runningRow) {
      await connection.commit();

      return {
        completedPhase: null,
        startedPhase: null,
      };
    }

    const completedAt =
      new Date().toISOString();

    await connection.execute(
      `
        UPDATE war_room_phases
        SET
          status = 'completed',
          ended_at = ?
        WHERE id = ?
      `,
      [
        toMysqlTimestamp(completedAt),
        String(runningRow.id),
      ]
    );

    const [completedRows] =
      await connection.execute(
        `
          SELECT *
          FROM war_room_phases
          WHERE id = ?
          LIMIT 1
        `,
        [String(runningRow.id)]
      );

    const completedRow =
      (completedRows as Array<Record<string, unknown>>)[0];

    if (!completedRow) {
      throw new Error(
        "Unable to reload completed War Room phase."
      );
    }

    const completedPhase =
      mapPhase(completedRow);

    await connection.execute(
      `
        INSERT INTO war_room_events (
          id,
          exercise_id,
          timestamp,
          source,
          model,
          event_type,
          severity,
          title,
          message,
          target,
          payload
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        `event-${crypto.randomUUID()}`,
        exerciseId,
        toMysqlTimestamp(
          completedPhase.endedAt ??
            completedAt
        ),
        "war-room",
        "red",
        "war_room.phase.completed",
        null,
        `${completedPhase.phase} phase completed`,
        `War Room phase "${completedPhase.phase}" completed.`,
        null,
        JSON.stringify({
          phaseId: completedPhase.id,
          sequenceNo:
            completedPhase.sequenceNo,
        }),
      ]
    );

    const [pendingRows] =
      await connection.execute(
        `
          SELECT *
          FROM war_room_phases
          WHERE exercise_id = ?
            AND status = 'pending'
          ORDER BY sequence_no ASC
          LIMIT 1
          FOR UPDATE
        `,
        [exerciseId]
      );

    const pendingRow =
      (pendingRows as Array<Record<string, unknown>>)[0];

    let startedPhase: WarRoomPhase | null =
      null;

    if (pendingRow) {
      const startedAt =
        new Date().toISOString();

      await connection.execute(
        `
          UPDATE war_room_phases
          SET
            status = 'running',
            started_at = ?
          WHERE id = ?
        `,
        [
          toMysqlTimestamp(startedAt),
          String(pendingRow.id),
        ]
      );

      const [startedRows] =
        await connection.execute(
          `
            SELECT *
            FROM war_room_phases
            WHERE id = ?
            LIMIT 1
          `,
          [String(pendingRow.id)]
        );

      const startedRow =
        (startedRows as Array<Record<string, unknown>>)[0];

      if (!startedRow) {
        throw new Error(
          "Unable to reload started War Room phase."
        );
      }

      startedPhase =
        mapPhase(startedRow);

      await connection.execute(
        `
          INSERT INTO war_room_events (
            id,
            exercise_id,
            timestamp,
            source,
            model,
            event_type,
            severity,
            title,
            message,
            target,
            payload
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `event-${crypto.randomUUID()}`,
          exerciseId,
          toMysqlTimestamp(
            startedPhase.startedAt ??
              startedAt
          ),
          "war-room",
          "red",
          "war_room.phase.started",
          null,
          `${startedPhase.phase} phase started`,
          `War Room phase "${startedPhase.phase}" started.`,
          null,
          JSON.stringify({
            phaseId: startedPhase.id,
            sequenceNo:
              startedPhase.sequenceNo,
          }),
        ]
      );
    }

    await connection.commit();

    return {
      completedPhase,
      startedPhase,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function addWarRoomEvent(
  event: WarRoomEvent
): Promise<void> {
  const pool = requireDb();

  const exercise =
    await getWarRoomExercise(
      event.exerciseId
    );

  if (!exercise) {
    throw new Error(
      "Cannot add an event to an unknown War Room exercise."
    );
  }

  await pool.execute(
    `
      INSERT INTO war_room_events (
        id,
        exercise_id,
        timestamp,
        source,
        model,
        event_type,
        severity,
        title,
        message,
        target,
        payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      event.id,
      event.exerciseId,
      toMysqlTimestamp(event.timestamp),
      event.source,
      event.model ?? null,
      event.eventType,
      event.severity ?? null,
      event.title,
      event.message ?? null,
      event.target ?? null,
      event.payload
        ? JSON.stringify(event.payload)
        : null,
    ]
  );
}

export async function listWarRoomEvents(
  exerciseId: string,
  limit = 200
): Promise<WarRoomEvent[]> {
  const pool = requireDb();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 200, 1),
    500
  );

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        exercise_id,
        timestamp,
        source,
        model,
        event_type,
        severity,
        title,
        message,
        target,
        payload
      FROM war_room_events
      WHERE exercise_id = ?
      ORDER BY timestamp DESC, id DESC
      LIMIT ?
    `,
    [exerciseId, safeLimit]
  );

  return (
    rows as Array<Record<string, unknown>>
  ).map(mapEvent);
}


export async function addWarRoomEvidence(
  evidence: WarRoomEvidence
): Promise<void> {
  const pool = requireDb();

  const exercise =
    await getWarRoomExercise(
      evidence.exerciseId
    );

  if (!exercise) {
    throw new Error(
      "Cannot add evidence to an unknown War Room exercise."
    );
  }

  await pool.execute(
    `
      INSERT INTO war_room_evidence (
        id,
        exercise_id,
        finding_id,
        type,
        title,
        description,
        source,
        source_id,
        metadata,
        content,
        artifact_path,
        captured_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      evidence.id,
      evidence.exerciseId,
      evidence.findingId ?? null,
      evidence.type,
      evidence.title,
      evidence.description ?? null,
      evidence.source,
      evidence.sourceId ?? null,
      evidence.metadata
        ? JSON.stringify(evidence.metadata)
        : null,
      evidence.content ?? null,
      evidence.artifactPath ?? null,
      toMysqlTimestamp(
        evidence.capturedAt
      ),
      toMysqlTimestamp(
        evidence.createdAt
      ),
    ]
  );
}

export async function listWarRoomEvidence(
  exerciseId: string,
  limit = 200
): Promise<WarRoomEvidence[]> {
  const pool = requireDb();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 200, 1),
    500
  );

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        exercise_id,
        finding_id,
        type,
        title,
        description,
        source,
        source_id,
        metadata,
        content,
        artifact_path,
        captured_at,
        created_at
      FROM war_room_evidence
      WHERE exercise_id = ?
      ORDER BY captured_at DESC, id DESC
      LIMIT ?
    `,
    [exerciseId, safeLimit]
  );

  return (
    rows as Array<Record<string, unknown>>
  ).map(mapEvidence);
}
