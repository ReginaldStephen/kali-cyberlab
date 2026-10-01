import React, { useCallback, useEffect, useMemo, useState } from "react";

import type {
  WarRoomEvent,
  WarRoomEvidence,
  WarRoomExercise,
  WarRoomPhase,
  WarRoomModel,
} from "../types";

interface WarRoomDashboardProps {
  onBack?: () => void;
}

interface ExerciseListResponse {
  success: boolean;
  exercises?: WarRoomExercise[];
  error?: string;
}

interface ExerciseResponse {
  success: boolean;
  exercise?: WarRoomExercise;
  error?: string;
}

interface PhasesResponse {
  success: boolean;
  phases?: WarRoomPhase[];
  error?: string;
}

interface EventsResponse {
  success: boolean;
  events?: WarRoomEvent[];
  error?: string;
}

interface EvidenceResponse {
  success: boolean;
  evidence?: WarRoomEvidence[];
  error?: string;
}

const MODEL_META: Record<
  WarRoomModel,
  {
    label: string;
    description: string;
    eventType: string;
    title: string;
    message: string;
  }
> = {
  red: {
    label: "RED TEAM",
    description: "Offensive simulation",
    eventType: "red.simulated",
    title: "Red Team Simulation",
    message:
      "Red Team simulated activity against the authorized War Room target.",
  },
  yellow: {
    label: "YELLOW TEAM",
    description: "Detection / investigation",
    eventType: "yellow.simulated",
    title: "Yellow Team Detection",
    message:
      "Yellow Team simulated detection and investigation activity against the authorized War Room target.",
  },
  blue: {
    label: "BLUE TEAM",
    description: "Defense / remediation",
    eventType: "blue.simulated",
    title: "Blue Team Remediation",
    message:
      "Blue Team simulated defensive remediation against the authorized War Room target.",
  },
};

const PHASE_LABELS: Record<string, string> = {
  reconnaissance: "Reconnaissance",
  enumeration: "Enumeration",
  initial_access: "Initial Access",
  exploitation: "Exploitation",
  privilege_attempt: "Privilege Attempt",
  persistence_simulation: "Persistence Simulation",
  lateral_movement_simulation: "Lateral Movement Simulation",
  data_access_simulation: "Data Access Simulation",
};

function phaseLabel(phase: string): string {
  return (
    PHASE_LABELS[phase] ||
    phase
      .replace(/_/g, " ")
      .replace(/\b\w/g, (value) => value.toUpperCase())
  );
}

function statusClass(status: WarRoomExercise["status"]): string {
  switch (status) {
    case "running":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "paused":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "completed":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
    case "cancelled":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    default:
      return "border-slate-700 bg-slate-900 text-slate-400";
  }
}

function modelClass(model: WarRoomModel): string {
  switch (model) {
    case "red":
      return "border-red-500/30 bg-red-500/5 text-red-300";
    case "yellow":
      return "border-amber-500/30 bg-amber-500/5 text-amber-300";
    case "blue":
      return "border-cyan-500/30 bg-cyan-500/5 text-cyan-300";
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export default function WarRoomDashboard({
  onBack,
}: WarRoomDashboardProps) {
  const [exercises, setExercises] = useState<WarRoomExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] =
    useState<string>("");

  const [exercise, setExercise] =
    useState<WarRoomExercise | null>(null);
  const [phases, setPhases] =
    useState<WarRoomPhase[]>([]);
  const [events, setEvents] =
    useState<WarRoomEvent[]>([]);
  const [evidence, setEvidence] =
    useState<WarRoomEvidence[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);
  const [isActionLoading, setIsActionLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const [simulationModel, setSimulationModel] =
    useState<WarRoomModel>("red");
  const [simulationTarget, setSimulationTarget] =
    useState("");
  const [simulationMessage, setSimulationMessage] =
    useState("");

  const selectedPhase = useMemo(
    () =>
      phases.find(
        (phase) => phase.status === "running"
      ) || null,
    [phases]
  );

  const loadExercises = useCallback(
    async (selectFirst = true) => {
      const response = await fetch(
        "/api/war-room/exercises",
        {
          credentials: "include",
        }
      );

      const data =
        (await response.json()) as ExerciseListResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load War Room exercises."
        );
      }

      const nextExercises =
        data.exercises || [];

      setExercises(nextExercises);

      if (
        selectFirst &&
        !selectedExerciseId &&
        nextExercises.length > 0
      ) {
        setSelectedExerciseId(
          nextExercises[0].id
        );
      }

      return nextExercises;
    },
    [selectedExerciseId]
  );

  const loadExerciseState =
    useCallback(async (exerciseId: string) => {
      const [
        exerciseResponse,
        phasesResponse,
        eventsResponse,
        evidenceResponse,
      ] = await Promise.all([
        fetch(
          `/api/war-room/exercises/${encodeURIComponent(
            exerciseId
          )}`,
          { credentials: "include" }
        ),
        fetch(
          `/api/war-room/exercises/${encodeURIComponent(
            exerciseId
          )}/phases`,
          { credentials: "include" }
        ),
        fetch(
          `/api/war-room/exercises/${encodeURIComponent(
            exerciseId
          )}/events`,
          { credentials: "include" }
        ),
        fetch(
          `/api/war-room/exercises/${encodeURIComponent(
            exerciseId
          )}/evidence`,
          { credentials: "include" }
        ),
      ]);

      const exerciseData =
        (await exerciseResponse.json()) as ExerciseResponse;
      const phasesData =
        (await phasesResponse.json()) as PhasesResponse;
      const eventsData =
        (await eventsResponse.json()) as EventsResponse;
      const evidenceData =
        (await evidenceResponse.json()) as EvidenceResponse;

      if (
        !exerciseResponse.ok ||
        !exerciseData.success
      ) {
        throw new Error(
          exerciseData.error ||
            "Unable to load War Room exercise."
        );
      }

      if (
        !phasesResponse.ok ||
        !phasesData.success
      ) {
        throw new Error(
          phasesData.error ||
            "Unable to load War Room phases."
        );
      }

      if (
        !eventsResponse.ok ||
        !eventsData.success
      ) {
        throw new Error(
          eventsData.error ||
            "Unable to load War Room events."
        );
      }

      if (
        !evidenceResponse.ok ||
        !evidenceData.success
      ) {
        throw new Error(
          evidenceData.error ||
            "Unable to load War Room evidence."
        );
      }

      const nextExercise =
        exerciseData.exercise || null;

      setExercise(nextExercise);
      setPhases(phasesData.phases || []);
      setEvents(eventsData.events || []);
      setEvidence(evidenceData.evidence || []);

      if (
        nextExercise &&
        simulationTarget === "" &&
        nextExercise.targetScope.targets.length > 0
      ) {
        setSimulationTarget(
          nextExercise.targetScope.targets[0]
        );
      }
    }, [simulationTarget]);

  const refresh = useCallback(async () => {
    try {
      setError(null);

      const nextExercises =
        await loadExercises(false);

      const currentId =
        selectedExerciseId ||
        nextExercises[0]?.id ||
        "";

      if (currentId) {
        setSelectedExerciseId(currentId);
        await loadExerciseState(currentId);
      } else {
        setExercise(null);
        setPhases([]);
        setEvents([]);
        setEvidence([]);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to refresh War Room."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    loadExerciseState,
    loadExercises,
    selectedExerciseId,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }

    void loadExerciseState(
      selectedExerciseId
    );
  }, [
    loadExerciseState,
    selectedExerciseId,
  ]);

  const runExerciseAction = async (
    path: string,
    method = "POST"
  ) => {
    if (!selectedExerciseId) {
      return;
    }

    setIsActionLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/war-room/exercises/${encodeURIComponent(
          selectedExerciseId
        )}/${path}`,
        {
          method,
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "War Room action failed."
        );
      }

      await loadExerciseState(
        selectedExerciseId
      );
      await loadExercises(false);
    } catch (err: any) {
      setError(
        err?.message ||
          "War Room action failed."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const simulateEvent = async () => {
    if (!selectedExerciseId || !exercise) {
      return;
    }

    const meta =
      MODEL_META[simulationModel];

    setIsActionLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/war-room/exercises/${encodeURIComponent(
          selectedExerciseId
        )}/simulate`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            model: simulationModel,
            eventType:
              meta.eventType,
            title: meta.title,
            message:
              simulationMessage.trim() ||
              meta.message,
            target:
              simulationTarget.trim() ||
              undefined,
            severity:
              simulationModel === "red"
                ? "medium"
                : "low",
            payload: {
              simulationStage:
                selectedPhase?.phase ||
                "exercise",
              source:
                "war-room-dashboard",
            },
          }),
        }
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "War Room simulation failed."
        );
      }

      setSimulationMessage("");

      await loadExerciseState(
        selectedExerciseId
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "War Room simulation failed."
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const exerciseProgress = useMemo(() => {
    if (phases.length === 0) {
      return 0;
    }

    const completed =
      phases.filter(
        (phase) =>
          phase.status === "completed"
      ).length;

    return Math.round(
      (completed / phases.length) * 100
    );
  }, [phases]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Initializing War Room
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Exercise Control
            </span>
            {exercise && (
              <span
                className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusClass(
                  exercise.status
                )}`}
              >
                {exercise.status}
              </span>
            )}
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            War Room Simulation Lab
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Shared Red / Yellow / Blue exercise
            state for authorized security
            simulations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isActionLoading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Exercise
                </label>

                <select
                  value={selectedExerciseId}
                  onChange={(event) =>
                    setSelectedExerciseId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                >
                  {exercises.length === 0 && (
                    <option value="">
                      No exercises available
                    </option>
                  )}

                  {exercises.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name} ·{" "}
                        {item.status}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="min-w-[180px]">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
                  <span>Exercise Progress</span>
                  <span className="text-slate-300">
                    {exerciseProgress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{
                      width: `${exerciseProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {exercise && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Scenario
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    {exercise.scenarioType}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Difficulty
                  </p>
                  <p className="mt-1 text-sm capitalize text-slate-200">
                    {exercise.difficulty}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-400/70">
                    Authorization
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-300">
                    {exercise.targetScope.authorized
                      ? "AUTHORIZED"
                      : "NOT AUTHORIZED"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
                  Exercise Phases
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Shared exercise lifecycle
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {phases.length} phases
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {phases.map((phase) => (
                <div
                  key={phase.id}
                  className={`rounded-xl border p-3 ${
                    phase.status ===
                    "running"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        phase.status ===
                        "completed"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : phase.status ===
                            "running"
                            ? "bg-cyan-500/15 text-cyan-300"
                            : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {phase.sequenceNo}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-200">
                        {phaseLabel(
                          phase.phase
                        )}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                        {phase.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {exercise?.status ===
                "draft" && (
                <button
                  type="button"
                  onClick={() =>
                    void runExerciseAction(
                      "start"
                    )
                  }
                  disabled={
                    isActionLoading
                  }
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  Start Exercise
                </button>
              )}

              {exercise?.status ===
                "running" && (
                <button
                  type="button"
                  onClick={() =>
                    void runExerciseAction(
                      "advance-phase"
                    )
                  }
                  disabled={
                    isActionLoading
                  }
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/15 disabled:opacity-50"
                >
                  Advance Phase
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
                  Team Simulation Controls
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Emit controlled simulation events
                  into the shared exercise state.
                </p>
              </div>

              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-300">
                Scope Enforced
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {(
                ["red", "yellow", "blue"] as WarRoomModel[]
              ).map((model) => {
                const meta =
                  MODEL_META[model];
                const selected =
                  simulationModel ===
                  model;

                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() =>
                      setSimulationModel(
                        model
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? modelClass(model)
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-xs font-bold tracking-[0.15em]">
                      {meta.label}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Authorized Target
                </label>

                <select
                  value={simulationTarget}
                  onChange={(event) =>
                    setSimulationTarget(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                >
                  {exercise?.targetScope.targets.map(
                    (target) => (
                      <option
                        key={target}
                        value={target}
                      >
                        {target}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Simulation Message
                </label>

                <textarea
                  value={simulationMessage}
                  onChange={(event) =>
                    setSimulationMessage(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder={
                    MODEL_META[
                      simulationModel
                    ].message
                  }
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-500/50"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  void simulateEvent()
                }
                disabled={
                  isActionLoading ||
                  !exercise ||
                  exercise.status !==
                    "running" ||
                  !exercise.targetScope
                    .authorized
                }
                className={`rounded-lg border px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition disabled:cursor-not-allowed disabled:opacity-40 ${modelClass(
                  simulationModel
                )}`}
              >
                Emit{" "}
                {MODEL_META[
                  simulationModel
                ].label}{" "}
                Simulation
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">
              Authorized Scope
            </p>

            <div className="mt-3 space-y-2">
              {exercise?.targetScope.targets.map(
                (target) => (
                  <div
                    key={target}
                    className="rounded-lg border border-emerald-500/15 bg-slate-950/50 px-3 py-2 font-mono text-sm text-emerald-300"
                  >
                    {target}
                  </div>
                )
              )}
            </div>

            {exercise?.targetScope.notes && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {exercise.targetScope.notes}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
                  Live Event Stream
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
                  {events.length} events
                </p>
              </div>
            </div>

            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-5 text-center text-xs text-slate-600">
                  No events recorded.
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200">
                          {event.title}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
                          {event.eventType}
                        </p>
                      </div>

                      {event.model && (
                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${modelClass(
                            event.model
                          )}`}
                        >
                          {event.model}
                        </span>
                      )}
                    </div>

                    {event.message && (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {event.message}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-wider text-slate-600">
                      <span>
                        {formatTimestamp(
                          event.timestamp
                        )}
                      </span>

                      {event.target && (
                        <span>
                          TARGET:{" "}
                          {event.target}
                        </span>
                      )}

                      {event.severity && (
                        <span>
                          SEVERITY:{" "}
                          {event.severity}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
                  Evidence Ledger
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
                  {evidence.length} evidence items
                </p>
              </div>

              <span className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
                Persistent
              </span>
            </div>

            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {evidence.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-5 text-center text-xs text-slate-600">
                  No evidence recorded.
                </div>
              ) : (
                evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
                          {item.type.replace(/_/g, " ")}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        {item.source}
                      </span>
                    </div>

                    {item.description && (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>
                    )}

                    {item.content && (
                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                        <p className="whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-slate-500">
                          {item.content}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-wider text-slate-600">
                      <span>
                        {formatTimestamp(
                          item.capturedAt
                        )}
                      </span>

                      {item.findingId && (
                        <span>
                          FINDING: {item.findingId}
                        </span>
                      )}

                      {item.sourceId && (
                        <span>
                          SOURCE ID: {item.sourceId}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
