import { RpcShellyClient, type ShellyClient } from '@lcl/shelly-client';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';

export type PulseOperationalPhase = 'inactive' | 'delay' | 'on' | 'off' | 'completed';
export type PulseOperationalAvailability = 'available' | 'stale' | 'unavailable';

export type PulseOperationalStatus = {
  availability: PulseOperationalAvailability;
  phase: PulseOperationalPhase | null;
  cyclesCompleted: number | null;
  nextTransitionUptimeMs: number | null;
  lastReason: string | null;
  requestedOutputOn: boolean | null;
  finalOutputOn: boolean | null;
  automationFault: string | null;
  hardSafety: boolean | null;
  hardSafetyReason: string | null;
  deviceUptimeMs: number | null;
};

export type PulseOperationalStatusInput = Omit<PulseOperationalStatus, 'availability'>;

const ACTIVE_PHASES = new Set<PulseOperationalPhase>(['delay', 'on', 'off']);
const STALE_DEADLINE_GRACE_MS = 2_000;

export const unavailablePulseOperationalStatus = (): PulseOperationalStatus => ({
  availability: 'unavailable',
  phase: null,
  cyclesCompleted: null,
  nextTransitionUptimeMs: null,
  lastReason: null,
  requestedOutputOn: null,
  finalOutputOn: null,
  automationFault: null,
  hardSafety: null,
  hardSafetyReason: null,
  deviceUptimeMs: null
});

export const normalizePulseOperationalStatus = (
  input: PulseOperationalStatusInput | null | undefined
): PulseOperationalStatus => {
  if (!input?.phase) return unavailablePulseOperationalStatus();

  const deadlineStale =
    ACTIVE_PHASES.has(input.phase) &&
    input.nextTransitionUptimeMs !== null &&
    input.deviceUptimeMs !== null &&
    input.deviceUptimeMs > input.nextTransitionUptimeMs + STALE_DEADLINE_GRACE_MS;

  return {
    ...input,
    availability: deadlineStale ? 'stale' : 'available'
  };
};

export const pulseOperationalRemainingMs = (
  status: PulseOperationalStatus
): number | null => {
  if (
    status.availability !== 'available' ||
    status.nextTransitionUptimeMs === null ||
    status.deviceUptimeMs === null
  ) {
    return null;
  }
  return Math.max(0, status.nextTransitionUptimeMs - status.deviceUptimeMs);
};

const phaseFromCode = (code: unknown): PulseOperationalPhase | null => {
  if (code === 0) return 'inactive';
  if (code === 1) return 'delay';
  if (code === 2) return 'on';
  if (code === 3) return 'off';
  if (code === 4) return 'completed';
  return null;
};

const finiteNumberOrNull = (value: unknown): number | null | undefined =>
  value === null
    ? null
    : typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;

const nonNegativeIntegerOrNull = (value: unknown): number | null | undefined =>
  value === null
    ? null
    : typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : undefined;

export type PulseScriptOperationalState = {
  phase: PulseOperationalPhase;
  cyclesCompleted: number;
  nextTransitionUptimeMs: number | null;
  lastReason: string | null;
  requestedOutputOn: boolean;
  automationFault: string | null;
  deviceUptimeMs: number | null;
};

export const decodePulseScriptOperationalState = (
  result: string | null
): PulseScriptOperationalState | null => {
  if (!result) return null;
  try {
    const value = JSON.parse(result) as unknown;
    if (!Array.isArray(value) || value.length !== 7) return null;

    const phase = phaseFromCode(value[0]);
    const cyclesCompleted = nonNegativeIntegerOrNull(value[1]);
    const nextTransitionUptimeMs = finiteNumberOrNull(value[2]);
    const lastReason = value[3];
    const requestedOutput = value[4];
    const automationFault = value[5];
    const deviceUptimeMs = finiteNumberOrNull(value[6]);

    if (!phase || cyclesCompleted === null || cyclesCompleted === undefined) return null;
    if (nextTransitionUptimeMs === undefined || deviceUptimeMs === undefined) return null;
    if (lastReason !== null && typeof lastReason !== 'string') return null;
    if (requestedOutput !== 0 && requestedOutput !== 1) return null;
    if (automationFault !== null && typeof automationFault !== 'string') return null;

    return {
      phase,
      cyclesCompleted,
      nextTransitionUptimeMs,
      lastReason,
      requestedOutputOn: requestedOutput === 1,
      automationFault,
      deviceUptimeMs
    };
  } catch {
    return null;
  }
};

export const pulseScriptOperationalStatusEvalCode =
  'typeof R==="object"?JSON.stringify([R.ps,R.pc,R.pn,R.rs,R.a?1:0,R.af,typeof Shelly.getUptimeMs==="function"?Shelly.getUptimeMs():null]):""';

export type PulseOperationalStatusClient = Pick<
  ShellyClient,
  'evaluateScript' | 'getStatus'
>;

export const createPulseOperationalStatusClient = (
  baseUrl: string
): PulseOperationalStatusClient => new RpcShellyClient(createShellyTransport(baseUrl));

export const readScriptPulseOperationalStatus = async (
  target: { baseUrl: string; scriptId: number },
  client = createPulseOperationalStatusClient(target.baseUrl)
): Promise<PulseOperationalStatus> => {
  const [evalResult, statusResult] = await Promise.all([
    client.evaluateScript(target.scriptId, pulseScriptOperationalStatusEvalCode),
    client.getStatus()
  ]);
  const encoded = unwrapShellyResult(evalResult);
  const shellyStatus = unwrapShellyResult(statusResult);
  const scriptState = decodePulseScriptOperationalState(encoded);
  if (!scriptState) return unavailablePulseOperationalStatus();

  return normalizePulseOperationalStatus({
    ...scriptState,
    finalOutputOn: shellyStatus.relayOn,
    hardSafety: null,
    hardSafetyReason: null
  });
};
