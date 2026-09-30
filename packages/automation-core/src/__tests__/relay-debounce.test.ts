import { evaluateRelayDebounce, type RelayDebounceState } from '../actions/relayDebounce.js';
import { evaluateRelayTiming } from '../actions/relayTiming.js';

const policy = {
  turnOnMs: 5_000,
  turnOffMs: 2_000
};

const setOn = { type: 'set' as const, relayOn: true };
const setOff = { type: 'set' as const, relayOn: false };

describe('evaluateRelayDebounce', () => {
  it('passes a request immediately when it already matches the relay state', () => {
    expect(
      evaluateRelayDebounce({
        action: setOff,
        policy,
        state: { pendingRelayOn: true, pendingSinceMs: 100 },
        currentRelayOn: false,
        nowMs: 500
      })
    ).toEqual({
      requestedAction: setOff,
      debouncedAction: setOff,
      nextState: {},
      blockedBy: null
    });
  });

  it('passes zero-duration debounce immediately', () => {
    expect(
      evaluateRelayDebounce({
        action: setOn,
        policy: { turnOnMs: 0, turnOffMs: 0 },
        state: {},
        currentRelayOn: false,
        nowMs: 1_000
      })
    ).toEqual({
      requestedAction: setOn,
      debouncedAction: setOn,
      nextState: {},
      blockedBy: null
    });
  });

  it('requires an ON target to remain stable for the configured duration', () => {
    const started = evaluateRelayDebounce({
      action: setOn,
      policy,
      state: {},
      currentRelayOn: false,
      nowMs: 10_000
    });
    expect(started).toEqual({
      requestedAction: setOn,
      debouncedAction: null,
      nextState: { pendingRelayOn: true, pendingSinceMs: 10_000 },
      blockedBy: 'debounce-on'
    });

    const pending = evaluateRelayDebounce({
      action: setOn,
      policy,
      state: started.nextState,
      currentRelayOn: false,
      nowMs: 14_999
    });
    expect(pending.debouncedAction).toBeNull();
    expect(pending.nextState).toEqual(started.nextState);

    const ready = evaluateRelayDebounce({
      action: setOn,
      policy,
      state: pending.nextState,
      currentRelayOn: false,
      nowMs: 15_000
    });
    expect(ready).toEqual({
      requestedAction: setOn,
      debouncedAction: setOn,
      nextState: { pendingRelayOn: true, pendingSinceMs: 10_000 },
      blockedBy: null
    });
  });

  it('uses an independent OFF debounce duration', () => {
    const started = evaluateRelayDebounce({
      action: setOff,
      policy,
      state: {},
      currentRelayOn: true,
      nowMs: 20_000
    });

    expect(
      evaluateRelayDebounce({
        action: setOff,
        policy,
        state: started.nextState,
        currentRelayOn: true,
        nowMs: 22_000
      }).debouncedAction
    ).toEqual(setOff);
  });

  it('restarts debounce when the requested target changes', () => {
    const onPending = evaluateRelayDebounce({
      action: setOn,
      policy,
      state: {},
      currentRelayOn: false,
      nowMs: 1_000
    });

    const cancelled = evaluateRelayDebounce({
      action: setOff,
      policy,
      state: onPending.nextState,
      currentRelayOn: false,
      nowMs: 4_000
    });
    expect(cancelled.nextState).toEqual({});
    expect(cancelled.debouncedAction).toEqual(setOff);

    const restarted = evaluateRelayDebounce({
      action: setOn,
      policy,
      state: cancelled.nextState,
      currentRelayOn: false,
      nowMs: 4_100
    });
    expect(restarted.nextState).toEqual({ pendingRelayOn: true, pendingSinceMs: 4_100 });
    expect(restarted.debouncedAction).toBeNull();
  });

  it('keeps a mature target ready while the timing gate still blocks application', () => {
    let state: RelayDebounceState = {};
    state = evaluateRelayDebounce({
      action: setOn,
      policy,
      state,
      currentRelayOn: false,
      nowMs: 10_000
    }).nextState;

    const ready = evaluateRelayDebounce({
      action: setOn,
      policy,
      state,
      currentRelayOn: false,
      nowMs: 15_000
    });
    expect(ready.debouncedAction).toEqual(setOn);
    if (!ready.debouncedAction) throw new Error('Expected mature debounce action.');

    const timing = evaluateRelayTiming({
      action: ready.debouncedAction,
      policy: { minimumOnMs: 0, minimumOffMs: 20_000 },
      state: { relayOn: false, lastChangeMs: 5_000 },
      nowMs: 15_000
    });
    expect(timing.blockedBy).toBe('minimum-off');

    const stillReady = evaluateRelayDebounce({
      action: setOn,
      policy,
      state: ready.nextState,
      currentRelayOn: false,
      nowMs: 16_000
    });
    expect(stillReady.debouncedAction).toEqual(setOn);
    expect(stillReady.nextState).toEqual({ pendingRelayOn: true, pendingSinceMs: 10_000 });
  });

  it('clears pending state after downstream application reaches the requested target', () => {
    const pending = { pendingRelayOn: true, pendingSinceMs: 1_000 };

    expect(
      evaluateRelayDebounce({
        action: setOn,
        policy,
        state: pending,
        currentRelayOn: true,
        nowMs: 10_000
      }).nextState
    ).toEqual({});
  });

  it('rejects invalid debounce durations', () => {
    expect(() =>
      evaluateRelayDebounce({
        action: setOn,
        policy: { turnOnMs: -1, turnOffMs: 0 },
        state: {},
        currentRelayOn: false,
        nowMs: 0
      })
    ).toThrow(RangeError);

    expect(() =>
      evaluateRelayDebounce({
        action: setOff,
        policy: { turnOnMs: 0, turnOffMs: Number.NaN },
        state: {},
        currentRelayOn: true,
        nowMs: 0
      })
    ).toThrow(RangeError);
  });
});
