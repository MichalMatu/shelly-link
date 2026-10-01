export const PULSE_MIN_PHASE_MS = 1_000;
export const PULSE_MAX_PHASE_MS = 86_400_000;
export const PULSE_MAX_INITIAL_DELAY_MS = 86_400_000;
export const PULSE_MAX_CYCLES = 100_000;
export const PULSE_MIN_DURATION_MS = 1_000;
export const PULSE_MAX_DURATION_MS = 604_800_000;

export type PulseCycleStartPhase = 'on' | 'off';

export type PulseCycleExecution =
  | { mode: 'continuous' }
  | { mode: 'cycles'; count: number }
  | { mode: 'duration'; durationMs: number };

export interface PulseCycleConfig {
  onMs: number;
  offMs: number;
  initialDelayMs: number;
  startPhase: PulseCycleStartPhase;
  execution: PulseCycleExecution;
}

export type PulseCycleEvaluation =
  | {
      status: 'delay';
      relayOn: false;
      elapsedMs: number;
      cyclesCompleted: 0;
      remainingDelayMs: number;
      nextTransitionAtMs: number;
    }
  | {
      status: 'running';
      phase: PulseCycleStartPhase;
      relayOn: boolean;
      elapsedMs: number;
      activeElapsedMs: number;
      phaseElapsedMs: number;
      phaseRemainingMs: number;
      cyclesCompleted: number;
      nextTransitionAtMs: number;
    }
  | {
      status: 'completed';
      relayOn: false;
      elapsedMs: number;
      activeElapsedMs: number;
      cyclesCompleted: number;
      completionReason: 'cycles' | 'duration';
      nextTransitionAtMs: null;
    };

const finiteInRange = (
  value: number,
  minimum: number,
  maximum: number,
  label: string
): void => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
};

const nonnegativeFinite = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
};

export const validatePulseCycleConfig = (config: PulseCycleConfig): void => {
  finiteInRange(config.onMs, PULSE_MIN_PHASE_MS, PULSE_MAX_PHASE_MS, 'Pulse ON duration');
  finiteInRange(config.offMs, PULSE_MIN_PHASE_MS, PULSE_MAX_PHASE_MS, 'Pulse OFF duration');
  finiteInRange(
    config.initialDelayMs,
    0,
    PULSE_MAX_INITIAL_DELAY_MS,
    'Pulse initial delay'
  );

  if (config.execution.mode === 'cycles') {
    if (
      !Number.isInteger(config.execution.count) ||
      config.execution.count < 1 ||
      config.execution.count > PULSE_MAX_CYCLES
    ) {
      throw new RangeError(`Pulse cycle count must be between 1 and ${PULSE_MAX_CYCLES}.`);
    }
  }

  if (config.execution.mode === 'duration') {
    finiteInRange(
      config.execution.durationMs,
      PULSE_MIN_DURATION_MS,
      PULSE_MAX_DURATION_MS,
      'Pulse total duration'
    );
  }
};

const completedOnPhasesAt = (config: PulseCycleConfig, activeElapsedMs: number): number => {
  const cycleMs = config.onMs + config.offMs;
  if (config.startPhase === 'on') {
    return Math.floor((activeElapsedMs + config.offMs) / cycleMs);
  }
  return Math.floor(activeElapsedMs / cycleMs);
};

const cyclesCompletionMs = (config: PulseCycleConfig, count: number): number =>
  config.startPhase === 'on'
    ? (count - 1) * (config.onMs + config.offMs) + config.onMs
    : count * (config.onMs + config.offMs);

const runningPhase = (
  config: PulseCycleConfig,
  activeElapsedMs: number
): {
  phase: PulseCycleStartPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  cyclesCompleted: number;
} => {
  const cycleMs = config.onMs + config.offMs;
  const offsetMs = activeElapsedMs % cycleMs;
  const cycleIndex = Math.floor(activeElapsedMs / cycleMs);

  if (config.startPhase === 'on') {
    if (offsetMs < config.onMs) {
      return {
        phase: 'on',
        phaseElapsedMs: offsetMs,
        phaseDurationMs: config.onMs,
        cyclesCompleted: cycleIndex
      };
    }
    return {
      phase: 'off',
      phaseElapsedMs: offsetMs - config.onMs,
      phaseDurationMs: config.offMs,
      cyclesCompleted: cycleIndex + 1
    };
  }

  if (offsetMs < config.offMs) {
    return {
      phase: 'off',
      phaseElapsedMs: offsetMs,
      phaseDurationMs: config.offMs,
      cyclesCompleted: cycleIndex
    };
  }
  return {
    phase: 'on',
    phaseElapsedMs: offsetMs - config.offMs,
    phaseDurationMs: config.onMs,
    cyclesCompleted: cycleIndex
  };
};

export const evaluatePulseCycle = (
  config: PulseCycleConfig,
  startedAtMs: number,
  nowMs: number
): PulseCycleEvaluation => {
  validatePulseCycleConfig(config);
  nonnegativeFinite(startedAtMs, 'Pulse start time');
  nonnegativeFinite(nowMs, 'Pulse current time');
  if (nowMs < startedAtMs) {
    throw new RangeError('Pulse current time cannot be earlier than its start time.');
  }

  const elapsedMs = nowMs - startedAtMs;
  if (elapsedMs < config.initialDelayMs) {
    return {
      status: 'delay',
      relayOn: false,
      elapsedMs,
      cyclesCompleted: 0,
      remainingDelayMs: config.initialDelayMs - elapsedMs,
      nextTransitionAtMs: startedAtMs + config.initialDelayMs
    };
  }

  const activeElapsedMs = elapsedMs - config.initialDelayMs;
  if (config.execution.mode === 'cycles') {
    const completionMs = cyclesCompletionMs(config, config.execution.count);
    if (activeElapsedMs >= completionMs) {
      return {
        status: 'completed',
        relayOn: false,
        elapsedMs,
        activeElapsedMs,
        cyclesCompleted: config.execution.count,
        completionReason: 'cycles',
        nextTransitionAtMs: null
      };
    }
  }

  if (
    config.execution.mode === 'duration' &&
    activeElapsedMs >= config.execution.durationMs
  ) {
    return {
      status: 'completed',
      relayOn: false,
      elapsedMs,
      activeElapsedMs,
      cyclesCompleted: completedOnPhasesAt(config, config.execution.durationMs),
      completionReason: 'duration',
      nextTransitionAtMs: null
    };
  }

  const phase = runningPhase(config, activeElapsedMs);
  const naturalRemainingMs = phase.phaseDurationMs - phase.phaseElapsedMs;
  const executionRemainingMs =
    config.execution.mode === 'duration'
      ? config.execution.durationMs - activeElapsedMs
      : Number.POSITIVE_INFINITY;
  const phaseRemainingMs = Math.min(naturalRemainingMs, executionRemainingMs);

  return {
    status: 'running',
    phase: phase.phase,
    relayOn: phase.phase === 'on',
    elapsedMs,
    activeElapsedMs,
    phaseElapsedMs: phase.phaseElapsedMs,
    phaseRemainingMs,
    cyclesCompleted: phase.cyclesCompleted,
    nextTransitionAtMs: nowMs + phaseRemainingMs
  };
};
