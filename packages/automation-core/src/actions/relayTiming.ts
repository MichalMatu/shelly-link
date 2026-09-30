export interface RelaySetAction {
  type: 'set';
  relayOn: boolean;
}

export interface RelayTimingPolicy {
  minimumOnMs: number;
  minimumOffMs: number;
}

export type RelayTimingBlockReason = 'minimum-on' | 'minimum-off';

export interface RelayTimingState {
  relayOn: boolean;
  lastChangeMs?: number | undefined;
}

export interface RelayTimingInput {
  action: RelaySetAction;
  policy: RelayTimingPolicy;
  state: RelayTimingState;
  nowMs: number;
}

export interface RelayTimingDecision {
  requestedAction: RelaySetAction;
  appliedAction: RelaySetAction;
  blockedBy: RelayTimingBlockReason | null;
}

export const relayTimingPolicyFromLegacyMinChange = (
  minChangeMs: number
): RelayTimingPolicy => ({
  minimumOnMs: 0,
  minimumOffMs: minChangeMs
});

export const evaluateRelayTiming = (input: RelayTimingInput): RelayTimingDecision => {
  const { action, policy, state, nowMs } = input;

  if (action.relayOn === state.relayOn || state.lastChangeMs === undefined) {
    return {
      requestedAction: action,
      appliedAction: action,
      blockedBy: null
    };
  }

  const elapsedMs = nowMs - state.lastChangeMs;
  const minimumMs = state.relayOn ? policy.minimumOnMs : policy.minimumOffMs;
  if (elapsedMs >= minimumMs) {
    return {
      requestedAction: action,
      appliedAction: action,
      blockedBy: null
    };
  }

  return {
    requestedAction: action,
    appliedAction: {
      type: 'set',
      relayOn: state.relayOn
    },
    blockedBy: state.relayOn ? 'minimum-on' : 'minimum-off'
  };
};
