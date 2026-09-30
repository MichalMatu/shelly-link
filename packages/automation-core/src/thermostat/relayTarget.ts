import { evaluateRelayDebounce } from '../actions/relayDebounce.js';
import { evaluateRelayTiming } from '../actions/relayTiming.js';
import type {
  AutomationDecision,
  AutomationInput,
  AutomationState,
  RelayDecisionReason
} from '../model.js';

export const clearRelayDebounceState = (state: AutomationState): AutomationState =>
  state.relayDebounceState === undefined
    ? state
    : { ...state, relayDebounceState: { status: 'idle' } };

export const applyRelayTarget = (
  input: AutomationInput,
  requestedRelayOn: boolean,
  reason: RelayDecisionReason,
  stateWithHits: AutomationState
): AutomationDecision => {
  const { rule, state, nowMs } = input;
  const debouncePolicy = rule.relayDebounce;
  const debounceEnabled =
    debouncePolicy !== undefined &&
    (debouncePolicy.turnOnMs > 0 || debouncePolicy.turnOffMs > 0);
  let nextDebounceState = state.relayDebounceState;

  if (debounceEnabled) {
    const debounceDecision = evaluateRelayDebounce({
      action: {
        type: 'set',
        relayOn: requestedRelayOn
      },
      policy: debouncePolicy,
      state: state.relayDebounceState ?? { status: 'idle' },
      currentRelayOn: state.relayOn,
      nowMs
    });
    nextDebounceState = debounceDecision.nextState;

    if (debounceDecision.blockedBy) {
      return {
        requestedRelayOn: state.relayOn,
        shouldCallRelay: false,
        reason: 'debounce-blocked',
        nextState: {
          ...stateWithHits,
          relayOn: state.relayOn,
          relayDebounceState: nextDebounceState
        }
      };
    }
  }

  if (requestedRelayOn === state.relayOn) {
    return {
      requestedRelayOn,
      shouldCallRelay: false,
      reason,
      nextState: debounceEnabled
        ? { ...stateWithHits, relayDebounceState: { status: 'idle' } }
        : stateWithHits
    };
  }

  const timingDecision = evaluateRelayTiming({
    action: {
      type: 'set',
      relayOn: requestedRelayOn
    },
    policy: {
      minimumOnMs: rule.minimumOnMs ?? 0,
      minimumOffMs: rule.minChangeMs
    },
    state: {
      relayOn: state.relayOn,
      lastChangeMs: state.lastChangeMs
    },
    nowMs
  });
  if (timingDecision.blockedBy) {
    return {
      requestedRelayOn: state.relayOn,
      shouldCallRelay: false,
      reason: 'min-change-blocked',
      nextState: {
        ...stateWithHits,
        relayOn: state.relayOn,
        ...(debounceEnabled ? { relayDebounceState: nextDebounceState } : {})
      }
    };
  }

  return {
    requestedRelayOn,
    shouldCallRelay: true,
    reason,
    nextState: {
      ...stateWithHits,
      relayOn: requestedRelayOn,
      lastChangeMs: nowMs,
      onStartedMs: requestedRelayOn ? nowMs : undefined,
      ...(debounceEnabled ? { relayDebounceState: { status: 'idle' } } : {})
    }
  };
};
