import type { RelayPulseAction, RelaySetAction } from './relayAction.js';

export interface RelayPulsePendingStartState {
  status: 'pending-start';
  targetRelayOn: boolean;
  restoreRelayOn: boolean;
  durationMs: number;
}

export interface RelayPulseActiveState {
  status: 'active';
  targetRelayOn: boolean;
  restoreRelayOn: boolean;
  expiresAtMs: number;
}

export interface RelayPulsePendingRestoreState {
  status: 'pending-restore';
  targetRelayOn: boolean;
  restoreRelayOn: boolean;
}

export type RelayPulseState =
  RelayPulsePendingStartState | RelayPulseActiveState | RelayPulsePendingRestoreState;

export type RelayPulsePhase =
  'pending-start' | 'started' | 'active' | 'pending-restore' | 'completed' | 'cancelled';

export interface RelayPulseDecision {
  requestedAction: RelaySetAction | null;
  nextState: RelayPulseState | null;
  phase: RelayPulsePhase;
}

const setAction = (relayOn: boolean): RelaySetAction => ({
  type: 'set',
  relayOn
});

export const startRelayPulse = (
  action: RelayPulseAction,
  currentRelayOn: boolean
): RelayPulseDecision => {
  if (!Number.isFinite(action.durationMs) || action.durationMs <= 0) {
    throw new RangeError('Relay pulse duration must be a positive finite number.');
  }

  const nextState: RelayPulsePendingStartState = {
    status: 'pending-start',
    targetRelayOn: action.relayOn,
    restoreRelayOn: currentRelayOn,
    durationMs: action.durationMs
  };

  return {
    requestedAction: setAction(action.relayOn),
    nextState,
    phase: 'pending-start'
  };
};

export const confirmRelayPulseActionApplied = (
  state: RelayPulseState,
  nowMs: number
): RelayPulseDecision => {
  if (state.status === 'pending-start') {
    return {
      requestedAction: null,
      nextState: {
        status: 'active',
        targetRelayOn: state.targetRelayOn,
        restoreRelayOn: state.restoreRelayOn,
        expiresAtMs: nowMs + state.durationMs
      },
      phase: 'started'
    };
  }

  if (state.status === 'pending-restore') {
    return {
      requestedAction: null,
      nextState: null,
      phase: 'completed'
    };
  }

  return {
    requestedAction: null,
    nextState: state,
    phase: 'active'
  };
};

export const advanceRelayPulse = (
  state: RelayPulseState,
  nowMs: number
): RelayPulseDecision => {
  if (state.status === 'pending-start') {
    return {
      requestedAction: setAction(state.targetRelayOn),
      nextState: state,
      phase: 'pending-start'
    };
  }

  if (state.status === 'pending-restore') {
    return {
      requestedAction: setAction(state.restoreRelayOn),
      nextState: state,
      phase: 'pending-restore'
    };
  }

  if (nowMs >= state.expiresAtMs) {
    return {
      requestedAction: setAction(state.restoreRelayOn),
      nextState: {
        status: 'pending-restore',
        targetRelayOn: state.targetRelayOn,
        restoreRelayOn: state.restoreRelayOn
      },
      phase: 'pending-restore'
    };
  }

  return {
    requestedAction: setAction(state.targetRelayOn),
    nextState: state,
    phase: 'active'
  };
};

export const cancelRelayPulse = (): RelayPulseDecision => ({
  requestedAction: null,
  nextState: null,
  phase: 'cancelled'
});
