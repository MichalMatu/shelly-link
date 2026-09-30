import {
  advanceRelayPulse,
  cancelRelayPulse,
  startRelayPulse
} from '../actions/relayPulse.js';

describe('relay pulse actions', () => {
  it('starts Pulse ON by requesting ON and scheduling OFF at expiry', () => {
    expect(
      startRelayPulse({ type: 'pulse', relayOn: true, durationMs: 5_000 }, 10_000)
    ).toEqual({
      requestedAction: { type: 'set', relayOn: true },
      nextState: {
        relayOn: true,
        restoreRelayOn: false,
        expiresAtMs: 15_000
      },
      phase: 'started'
    });
  });

  it('starts Pulse OFF by requesting OFF and scheduling ON at expiry', () => {
    expect(
      startRelayPulse({ type: 'pulse', relayOn: false, durationMs: 5_000 }, 10_000)
    ).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      nextState: {
        relayOn: false,
        restoreRelayOn: true,
        expiresAtMs: 15_000
      },
      phase: 'started'
    });
  });

  it('keeps requesting the pulse target before expiry', () => {
    const state = {
      relayOn: true,
      restoreRelayOn: false,
      expiresAtMs: 15_000
    };

    expect(advanceRelayPulse(state, 14_999)).toEqual({
      requestedAction: { type: 'set', relayOn: true },
      nextState: state,
      phase: 'active'
    });
  });

  it('requests the restore target exactly at expiry and clears pulse state', () => {
    expect(
      advanceRelayPulse(
        { relayOn: true, restoreRelayOn: false, expiresAtMs: 15_000 },
        15_000
      )
    ).toEqual({
      requestedAction: { type: 'set', relayOn: false },
      nextState: null,
      phase: 'expired'
    });
  });

  it('cancels without emitting a relay request so the higher-priority owner can decide', () => {
    expect(cancelRelayPulse()).toEqual({
      requestedAction: null,
      nextState: null,
      phase: 'cancelled'
    });
  });

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])(
    'rejects invalid duration %s',
    (durationMs) => {
      expect(() =>
        startRelayPulse({ type: 'pulse', relayOn: true, durationMs }, 0)
      ).toThrow('Relay pulse duration must be a positive finite number.');
    }
  );
});
