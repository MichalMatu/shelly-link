import {
  normalizePulseOperationalStatus,
  type PulseOperationalPhase,
  type PulseOperationalStatus
} from './pulseOperationalStatus.js';

export type ClimatePulseOperationalSnapshot = {
  execution?: {
    pulse: {
      phase: PulseOperationalPhase | null;
      cyclesCompleted: number;
      nextTransitionUptimeMs: number | null;
      lastReason: string | null;
    } | null;
  } | null;
  diagnostics: {
    lastReason: string;
    relayState: boolean;
    automationRequestedRelayState?: boolean | null;
    automationFault?: string | null;
    safetyLockout?: boolean;
    safetyReason?: string | null;
  };
  plug?: { relayState: boolean } | null;
  time: { uptimeSec: number | null };
};

export type ClimatePulseOperationalControl = {
  relayOn: boolean;
  automationFault: string | null;
  safetyLockout: boolean;
  safetyReason: string | null;
};

export const climatePulseOperationalStatus = ({
  snapshot,
  control
}: {
  snapshot: ClimatePulseOperationalSnapshot | undefined;
  control: ClimatePulseOperationalControl | undefined;
}): PulseOperationalStatus => {
  const pulse = snapshot?.execution?.pulse;
  if (!snapshot || !pulse) return normalizePulseOperationalStatus(null);

  return normalizePulseOperationalStatus({
    phase: pulse.phase,
    cyclesCompleted: pulse.cyclesCompleted,
    nextTransitionUptimeMs: pulse.nextTransitionUptimeMs,
    lastReason: pulse.lastReason ?? snapshot.diagnostics.lastReason ?? null,
    requestedOutputOn: snapshot.diagnostics.automationRequestedRelayState ?? null,
    finalOutputOn:
      snapshot.plug?.relayState ??
      control?.relayOn ??
      snapshot.diagnostics.relayState ??
      null,
    automationFault:
      control?.automationFault ?? snapshot.diagnostics.automationFault ?? null,
    hardSafety: control?.safetyLockout ?? snapshot.diagnostics.safetyLockout ?? null,
    hardSafetyReason: control?.safetyReason ?? snapshot.diagnostics.safetyReason ?? null,
    deviceUptimeMs:
      snapshot.time.uptimeSec != null && Number.isFinite(snapshot.time.uptimeSec)
        ? snapshot.time.uptimeSec * 1000
        : null
  });
};
