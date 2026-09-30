import type { RelaySetAction } from './relayTiming.js';

export interface RelayPulseAction {
  type: 'pulse';
  relayOn: boolean;
  durationMs: number;
}

export type RelayAction = RelaySetAction | RelayPulseAction;

export interface RelayPulseState {
  relayOn: boolean;
  restoreRelayOn: boolean;
  expiresAtMs: number;
}

export type RelayPulsePhase = 'started' | 'active' | 'expired' | 'cancelled';

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
  nowMs: number
): RelayPulseDecision => {
  if (!Number.isFinite(action.durationMs) || action.durationMs <= 0) {
    throw new RangeError('Relay pulse duration must be a positive finite number.');
  }

  const nextState: RelayPulseState = {
    relayOn: action.relayOn,
    restoreRelayOn: !action.relayOn,
    expiresAtMs: nowMs + action.durationMs
  };

  return {
    requestedAction: setAction(action.relayOn),
    nextState,
    phase: 'started'
  };
};

export const advanceRelayPulse = (
  state: RelayPulseState,
  nowMs: number
): RelayPulseDecision => {
  if (nowMs >= state.expiresAtMs) {
    return {
      requestedAction: setAction(state.restoreRelayOn),
      nextState: null,
      phase: 'expired'
    };
  }

  return {
    requestedAction: setAction(state.relayOn),
    nextState: state,
    phase: 'active'
  };
};

export const cancelRelayPulse = (): RelayPulseDecision => ({
  requestedAction: null,
  nextState: null,
  phase: 'cancelled'
});
