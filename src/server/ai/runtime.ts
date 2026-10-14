export interface CyberLabAIRuntimeRequestRecord {
  timestamp: string;
  providerId: string;
  providerDisplayName: string;
  requestedModel: string;
  returnedModel: string | null;
  attempt: number;
  success: boolean;
  statusCode: number | null;
  error: string | null;
}

export interface CyberLabAIRuntimeStatus {
  providerId: string | null;
  providerDisplayName: string | null;
  requestedModel: string | null;
  returnedModel: string | null;
  status: "idle" | "success" | "error";
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  recentRequests: CyberLabAIRuntimeRequestRecord[];
}

const MAX_RUNTIME_HISTORY = 25;

const runtimeStatus: CyberLabAIRuntimeStatus = {
  providerId: null,
  providerDisplayName: null,
  requestedModel: null,
  returnedModel: null,
  status: "idle",
  lastRequestAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
  recentRequests: [],
};

export interface RecordCyberLabAIRequest {
  providerId: string;
  providerDisplayName: string;
  requestedModel: string;
  returnedModel?: string | null;
  attempt: number;
  success: boolean;
  statusCode?: number | null;
  error?: string | null;
}

export function recordCyberLabAIRequest(
  request: RecordCyberLabAIRequest
): void {
  const now = new Date().toISOString();

  runtimeStatus.providerId =
    request.providerId;

  runtimeStatus.providerDisplayName =
    request.providerDisplayName;

  runtimeStatus.requestedModel =
    request.requestedModel;

  runtimeStatus.returnedModel =
    request.returnedModel || null;

  runtimeStatus.lastRequestAt = now;

  runtimeStatus.recentRequests.unshift({
    timestamp: now,
    providerId: request.providerId,
    providerDisplayName:
      request.providerDisplayName,
    requestedModel:
      request.requestedModel,
    returnedModel:
      request.returnedModel || null,
    attempt: request.attempt,
    success: request.success,
    statusCode:
      request.statusCode ?? null,
    error:
      request.error || null,
  });

  if (
    runtimeStatus.recentRequests.length >
    MAX_RUNTIME_HISTORY
  ) {
    runtimeStatus.recentRequests =
      runtimeStatus.recentRequests.slice(
        0,
        MAX_RUNTIME_HISTORY
      );
  }

  if (request.success) {
    runtimeStatus.status = "success";
    runtimeStatus.lastSuccessAt = now;
    runtimeStatus.lastError = null;
  } else {
    runtimeStatus.status = "error";
    runtimeStatus.lastErrorAt = now;
    runtimeStatus.lastError =
      request.error || "AI request failed.";
  }
}

export function getCyberLabAIRuntimeStatus(): CyberLabAIRuntimeStatus {
  return {
    ...runtimeStatus,
    recentRequests:
      runtimeStatus.recentRequests.map(
        (request) => ({ ...request })
      ),
  };
}
