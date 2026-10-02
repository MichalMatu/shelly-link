import {
  PULSE_MAX_CYCLES,
  PULSE_MAX_DURATION_MS,
  PULSE_MAX_INITIAL_DELAY_MS,
  PULSE_MAX_PHASE_MS,
  PULSE_MIN_DURATION_MS,
  PULSE_MIN_PHASE_MS,
  type PulseCycleConfig,
  type PulseCycleExecution,
  type PulseCycleStartPhase
} from '@lcl/automation-core';

export type PulseCycleExecutionMode = PulseCycleExecution['mode'];

export type PulseCycleFormDraft = {
  enabled: boolean;
  onSecondsInput: string;
  offSecondsInput: string;
  initialDelaySecondsInput: string;
  startPhase: PulseCycleStartPhase;
  executionMode: PulseCycleExecutionMode;
  cyclesInput: string;
  durationSecondsInput: string;
};

export type PulseCycleFormField =
  | 'onSecondsInput'
  | 'offSecondsInput'
  | 'initialDelaySecondsInput'
  | 'cyclesInput'
  | 'durationSecondsInput';

export type PulseCycleFormValidation =
  | { ok: true; config: PulseCycleConfig | null }
  | { ok: false; fieldErrors: Partial<Record<PulseCycleFormField, string>> };

export const DEFAULT_PULSE_CYCLE_FORM: PulseCycleFormDraft = {
  enabled: false,
  onSecondsInput: '10',
  offSecondsInput: '20',
  initialDelaySecondsInput: '0',
  startPhase: 'on',
  executionMode: 'continuous',
  cyclesInput: '3',
  durationSecondsInput: '60'
};

const millisecondsFromSeconds = (value: string): number => Number(value) * 1_000;

const secondsFromMilliseconds = (value: number): string => String(value / 1_000);

const inRange = (value: number, minimum: number, maximum: number): boolean =>
  Number.isInteger(value) && value >= minimum && value <= maximum;

export const pulseCycleFormFromConfig = (
  config?: PulseCycleConfig | null
): PulseCycleFormDraft => {
  if (!config) return { ...DEFAULT_PULSE_CYCLE_FORM };

  return {
    enabled: true,
    onSecondsInput: secondsFromMilliseconds(config.onMs),
    offSecondsInput: secondsFromMilliseconds(config.offMs),
    initialDelaySecondsInput: secondsFromMilliseconds(config.initialDelayMs),
    startPhase: config.startPhase,
    executionMode: config.execution.mode,
    cyclesInput:
      config.execution.mode === 'cycles'
        ? String(config.execution.count)
        : DEFAULT_PULSE_CYCLE_FORM.cyclesInput,
    durationSecondsInput:
      config.execution.mode === 'duration'
        ? secondsFromMilliseconds(config.execution.durationMs)
        : DEFAULT_PULSE_CYCLE_FORM.durationSecondsInput
  };
};

export const parsePulseCycleForm = (
  draft: PulseCycleFormDraft
): PulseCycleFormValidation => {
  if (!draft.enabled) return { ok: true, config: null };

  const fieldErrors: Partial<Record<PulseCycleFormField, string>> = {};
  const onMs = millisecondsFromSeconds(draft.onSecondsInput);
  const offMs = millisecondsFromSeconds(draft.offSecondsInput);
  const initialDelayMs = millisecondsFromSeconds(draft.initialDelaySecondsInput);

  if (!inRange(onMs, PULSE_MIN_PHASE_MS, PULSE_MAX_PHASE_MS)) {
    fieldErrors.onSecondsInput = 'range';
  }
  if (!inRange(offMs, PULSE_MIN_PHASE_MS, PULSE_MAX_PHASE_MS)) {
    fieldErrors.offSecondsInput = 'range';
  }
  if (!inRange(initialDelayMs, 0, PULSE_MAX_INITIAL_DELAY_MS)) {
    fieldErrors.initialDelaySecondsInput = 'range';
  }

  let execution: PulseCycleExecution = { mode: 'continuous' };
  if (draft.executionMode === 'cycles') {
    const count = Number(draft.cyclesInput);
    if (!inRange(count, 1, PULSE_MAX_CYCLES)) {
      fieldErrors.cyclesInput = 'range';
    } else {
      execution = { mode: 'cycles', count };
    }
  } else if (draft.executionMode === 'duration') {
    const durationMs = millisecondsFromSeconds(draft.durationSecondsInput);
    if (!inRange(durationMs, PULSE_MIN_DURATION_MS, PULSE_MAX_DURATION_MS)) {
      fieldErrors.durationSecondsInput = 'range';
    } else {
      execution = { mode: 'duration', durationMs };
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    config: {
      onMs,
      offMs,
      initialDelayMs,
      startPhase: draft.startPhase,
      execution
    }
  };
};
