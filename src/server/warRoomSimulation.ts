import crypto from "crypto";

import type {
  CyberLabEventSeverity,
  WarRoomEvent,
  WarRoomExercise,
  WarRoomModel,
} from "../types";

import {
  addWarRoomEvent,
  getWarRoomExercise,
} from "./warRoom";

export interface WarRoomSimulationInput {
  exerciseId: string;
  model: WarRoomModel;
  eventType: string;
  title: string;
  message: string;
  target?: string;
  severity?: CyberLabEventSeverity;
  payload?: Record<string, unknown>;
}

export interface WarRoomSimulationResult {
  exercise: WarRoomExercise;
  event: WarRoomEvent;
}

function requireAuthorizedExercise(
  exercise: WarRoomExercise | undefined
): WarRoomExercise {
  if (!exercise) {
    throw new Error(
      "War Room exercise not found."
    );
  }

  if (exercise.status !== "running") {
    throw new Error(
      `War Room simulation requires a running exercise. Current status: "${exercise.status}".`
    );
  }

  if (!exercise.targetScope.authorized) {
    throw new Error(
      "War Room simulation requires an explicitly authorized target scope."
    );
  }

  if (
    !Array.isArray(
      exercise.targetScope.targets
    ) ||
    exercise.targetScope.targets.length === 0
  ) {
    throw new Error(
      "War Room simulation requires at least one authorized target."
    );
  }

  return exercise;
}

function validateTarget(
  exercise: WarRoomExercise,
  target?: string
): string | undefined {
  if (!target) {
    return undefined;
  }

  if (
    !exercise.targetScope.targets.includes(
      target
    )
  ) {
    throw new Error(
      `Simulation target "${target}" is outside the authorized War Room scope.`
    );
  }

  return target;
}

export async function simulateWarRoomEvent(
  input: WarRoomSimulationInput
): Promise<WarRoomSimulationResult> {
  const exercise =
    await getWarRoomExercise(
      input.exerciseId
    );

  const authorizedExercise =
    requireAuthorizedExercise(
      exercise
    );

  const target =
    validateTarget(
      authorizedExercise,
      input.target
    );

  const timestamp =
    new Date().toISOString();

  const event: WarRoomEvent = {
    id: `event-${crypto.randomUUID()}`,
    exerciseId:
      authorizedExercise.id,
    timestamp,
    source:
      `war-room-${input.model}`,
    model: input.model,
    eventType:
      input.eventType,
    severity:
      input.severity,
    title:
      input.title,
    message:
      input.message,
    target,
    payload: {
      simulation: true,
      authorized: true,
      scenarioType:
        authorizedExercise.scenarioType,
      difficulty:
        authorizedExercise.difficulty,
      ...input.payload,
    },
  };

  await addWarRoomEvent(event);

  return {
    exercise:
      authorizedExercise,
    event,
  };
}

export async function simulateRedEvent(
  input: Omit<
    WarRoomSimulationInput,
    "model"
  >
): Promise<WarRoomSimulationResult> {
  return simulateWarRoomEvent({
    ...input,
    model: "red",
  });
}

export async function simulateYellowEvent(
  input: Omit<
    WarRoomSimulationInput,
    "model"
  >
): Promise<WarRoomSimulationResult> {
  return simulateWarRoomEvent({
    ...input,
    model: "yellow",
  });
}

export async function simulateBlueEvent(
  input: Omit<
    WarRoomSimulationInput,
    "model"
  >
): Promise<WarRoomSimulationResult> {
  return simulateWarRoomEvent({
    ...input,
    model: "blue",
  });
}
