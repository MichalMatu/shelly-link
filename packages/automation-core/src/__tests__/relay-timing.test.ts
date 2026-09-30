import {
  evaluateRelayTiming,
  relayTimingPolicyFromLegacyMinChange,
  type RelayTimingPolicy
} from '../actions/relayTiming.js';

const policy: RelayTimingPolicy = {
  minimumOnMs: 30_000,
  minimumOffMs: 120_000
};

describe('evaluateRelayTiming', () => {
  it('allows a set action when relay state is unchanged', () => {
    expect(
      evaluateRelayTiming({
        action: { type: 'set', relayOn: false },
        policy,
        state: { relayOn: false, lastChangeMs: 99_000 },
        nowMs: 100_000
      })
    ).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      appliedAction: { type: 'set', relayOn: false },
      blockedBy: null
    });
  });

  it('blocks OFF to ON until minimum OFF time has elapsed', () => {
    expect(
      evaluateRelayTiming({
        action: { type: 'set', relayOn: true },
        policy,
        state: { relayOn: false, lastChangeMs: 10_000 },
        nowMs: 100_000
      })
    ).toEqual({
      requestedAction: { type: 'set', relayOn: true },
      appliedAction: { type: 'set', relayOn: false },
      blockedBy: 'minimum-off'
    });
  });

  it('allows OFF to ON exactly at the minimum OFF boundary', () => {
    expect(
      evaluateRelayTiming({
        action: { type: 'set', relayOn: true },
        policy,
        state: { relayOn: false, lastChangeMs: 10_000 },
        nowMs: 130_000
      }).blockedBy
    ).toBeNull();
  });

  it('blocks ON to OFF until minimum ON time has elapsed', () => {
    expect(
      evaluateRelayTiming({
        action: { type: 'set', relayOn: false },
        policy,
        state: { relayOn: true, lastChangeMs: 80_000 },
        nowMs: 100_000
      })
    ).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      appliedAction: { type: 'set', relayOn: true },
      blockedBy: 'minimum-on'
    });
  });

  it('does not block the first transition when no change timestamp exists', () => {
    expect(
      evaluateRelayTiming({
        action: { type: 'set', relayOn: true },
        policy,
        state: { relayOn: false },
        nowMs: 1
      }).blockedBy
    ).toBeNull();
  });

  it('maps legacy minChangeMs to minimum OFF only', () => {
    expect(relayTimingPolicyFromLegacyMinChange(120_000)).toEqual({
      minimumOnMs: 0,
      minimumOffMs: 120_000
    });
  });
});
