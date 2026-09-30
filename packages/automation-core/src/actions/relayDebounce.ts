import type { RelaySetAction } from './relayAction.js';

export interface RelayDebouncePolicy {
  turnOnMs: number;
  turnOffMs: number;
}

export type RelayDebounceBlockReason = 'debounce-on' | 'debounce-off';

export interface RelayDebounceState {
  pendingRelayOn?: boolean | undefined;
  pendingSinceMs?: number | undefined;
}

export interface RelayDebounceInput {
  action: RelaySetAction;
  policy: RelayDebouncePolicy;
  state: RelayDebounceState;
  currentRelayOn: boolean;
  nowMs: number;
}

export interface RelayDebounceDecision {
  requestedAction: RelaySetAction;
  debouncedAction: RelaySetAction | null;
  nextState: RelayDebounceState;
  blockedBy: RelayDebounceBlockReason | null;
}

const validateDuration = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
};

export const evaluateRelayDebounce = (input: RelayDebounceInput): RelayDebounceDecision => {
  const { action, policy, state, currentRelayOn, nowMs } = input;

  validateDuration(policy.turnOnMs, 'Relay ON debounce');
  validateDuration(policy.turnOffMs, 'Relay OFF debounce');

  if (action.relayOn === currentRelayOn) {
    return {
      requestedAction: action,
      debouncedAction: action,
      nextState: {},
      blockedBy: null
    };
  }

  const requiredMs = action.relayOn ? policy.turnOnMs : policy.turnOffMs;
  if (requiredMs === 0) {
    return {
      requestedAction: action,
      debouncedAction: action,
      nextState: {},
      blockedBy: null
    };
  }

  const pendingSinceMs =
    state.pendingRelayOn === action.relayOn && state.pendingSinceMs !== undefined
      ? state.pendingSinceMs
      : nowMs;
  const nextState: RelayDebounceState = {
    pendingRelayOn: action.relayOn,
    pendingSinceMs
  };
  const elapsedMs = nowMs - pendingSinceMs;

  if (elapsedMs >= requiredMs) {
    return {
      requestedAction: action,
      debouncedAction: action,
      nextState,
      blockedBy: null
    };
  }

  return {
    requestedAction: action,
    debouncedAction: null,
    nextState,
    blockedBy: action.relayOn ? 'debounce-on' : 'debounce-off'
  };
};
