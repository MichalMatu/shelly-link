import {
  DEFAULT_HEATING_RULE,
  evaluateThresholdDecision,
  type AutomationState,
  type ThermostatRule
} from '../index.js';

const startMs = 1_000_000;

const measurement = (temperatureC: number, nowMs: number) => ({
  temperatureC,
  humidityPct: 45,
  rssi: -60,
  seenAtMs: nowMs
});

const ruleWithDebounce = (overrides: Partial<ThermostatRule> = {}): ThermostatRule => ({
  ...DEFAULT_HEATING_RULE,
  consecutiveHits: 1,
  minChangeMs: 1,
  relayDebounce: {
    turnOnMs: 5_000,
    turnOffMs: 0
  },
  ...overrides
});

const offState = (overrides: Partial<AutomationState> = {}): AutomationState => ({
  relayOn: false,
  onHits: 0,
  offHits: 0,
  ...overrides
});

describe('thermostat relay debounce integration', () => {
  it('requires a stable ON request for the configured debounce duration', () => {
    const rule = ruleWithDebounce();
    const first = evaluateThresholdDecision({
      rule,
      state: offState(),
      measurement: measurement(18, startMs),
      nowMs: startMs
    });

    expect(first).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: false,
      reason: 'debounce-blocked',
      nextState: {
        relayOn: false,
        relayDebounceState: {
          status: 'pending',
          relayOn: true,
          sinceMs: startMs
        }
      }
    });

    const almostReady = evaluateThresholdDecision({
      rule,
      state: first.nextState,
      measurement: measurement(18, startMs + 4_999),
      nowMs: startMs + 4_999
    });
    expect(almostReady.reason).toBe('debounce-blocked');

    const ready = evaluateThresholdDecision({
      rule,
      state: almostReady.nextState,
      measurement: measurement(18, startMs + 5_000),
      nowMs: startMs + 5_000
    });
    expect(ready).toMatchObject({
      requestedRelayOn: true,
      shouldCallRelay: true,
      reason: 'below-threshold',
      nextState: {
        relayOn: true,
        relayDebounceState: { status: 'idle' }
      }
    });
  });

  it('cancels a pending debounce when the request returns to the actual relay state', () => {
    const rule = ruleWithDebounce();
    const pending = evaluateThresholdDecision({
      rule,
      state: offState(),
      measurement: measurement(18, startMs),
      nowMs: startMs
    });

    const cancelled = evaluateThresholdDecision({
      rule,
      state: pending.nextState,
      measurement: measurement(19.5, startMs + 1_000),
      nowMs: startMs + 1_000
    });
    expect(cancelled).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: false,
      reason: 'inside-band',
      nextState: {
        relayDebounceState: { status: 'idle' }
      }
    });

    const restarted = evaluateThresholdDecision({
      rule,
      state: cancelled.nextState,
      measurement: measurement(18, startMs + 2_000),
      nowMs: startMs + 2_000
    });
    expect(restarted.nextState.relayDebounceState).toEqual({
      status: 'pending',
      relayOn: true,
      sinceMs: startMs + 2_000
    });
  });

  it('clears pending debounce when the requested target already matches the relay', () => {
    const decision = evaluateThresholdDecision({
      rule: ruleWithDebounce(),
      state: {
        relayOn: true,
        onHits: 0,
        offHits: 0,
        lastChangeMs: startMs - 10_000,
        onStartedMs: startMs - 10_000,
        relayDebounceState: {
          status: 'pending',
          relayOn: false,
          sinceMs: startMs - 500
        }
      },
      measurement: measurement(18, startMs),
      nowMs: startMs
    });

    expect(decision).toMatchObject({
      requestedRelayOn: true,
      shouldCallRelay: false,
      reason: 'below-threshold',
      nextState: {
        relayOn: true,
        relayDebounceState: { status: 'idle' }
      }
    });
  });

  it('supports an OFF-only debounce policy', () => {
    const rule = ruleWithDebounce({
      relayDebounce: {
        turnOnMs: 0,
        turnOffMs: 1_000
      }
    });
    const state: AutomationState = {
      relayOn: true,
      onHits: 0,
      offHits: 0,
      lastChangeMs: startMs - 10_000,
      onStartedMs: startMs - 10_000
    };

    const pending = evaluateThresholdDecision({
      rule,
      state,
      measurement: measurement(21, startMs),
      nowMs: startMs
    });
    expect(pending).toMatchObject({
      requestedRelayOn: true,
      shouldCallRelay: false,
      reason: 'debounce-blocked',
      nextState: {
        relayDebounceState: {
          status: 'pending',
          relayOn: false,
          sinceMs: startMs
        }
      }
    });

    const applied = evaluateThresholdDecision({
      rule,
      state: pending.nextState,
      measurement: measurement(21, startMs + 1_000),
      nowMs: startMs + 1_000
    });
    expect(applied).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: true,
      reason: 'above-threshold'
    });
  });

  it('treats an explicit zero debounce policy as disabled in the domain layer', () => {
    const rule = ruleWithDebounce({
      minimumOnMs: undefined,
      relayDebounce: {
        turnOnMs: 0,
        turnOffMs: 0
      }
    });
    const decision = evaluateThresholdDecision({
      rule,
      state: offState(),
      measurement: measurement(18, startMs),
      nowMs: startMs
    });

    expect(decision).toMatchObject({
      requestedRelayOn: true,
      shouldCallRelay: true,
      reason: 'below-threshold',
      nextState: {
        relayOn: true
      }
    });
    expect(decision.nextState.relayDebounceState).toBeUndefined();
  });

  it('keeps a mature debounce request ready while minimum OFF timing still blocks it', () => {
    const rule = ruleWithDebounce({
      minChangeMs: 5_000,
      relayDebounce: {
        turnOnMs: 1_000,
        turnOffMs: 0
      }
    });
    const initialState = offState({ lastChangeMs: startMs });
    const pending = evaluateThresholdDecision({
      rule,
      state: initialState,
      measurement: measurement(18, startMs),
      nowMs: startMs
    });

    const timingBlocked = evaluateThresholdDecision({
      rule,
      state: pending.nextState,
      measurement: measurement(18, startMs + 1_000),
      nowMs: startMs + 1_000
    });
    expect(timingBlocked).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: false,
      reason: 'min-change-blocked',
      nextState: {
        relayDebounceState: {
          status: 'pending',
          relayOn: true,
          sinceMs: startMs
        }
      }
    });

    const applied = evaluateThresholdDecision({
      rule,
      state: timingBlocked.nextState,
      measurement: measurement(18, startMs + 5_000),
      nowMs: startMs + 5_000
    });
    expect(applied).toMatchObject({
      requestedRelayOn: true,
      shouldCallRelay: true,
      reason: 'below-threshold'
    });
  });

  it('lets fail-safe stale OFF bypass and clear pending debounce state', () => {
    const rule = ruleWithDebounce({
      relayDebounce: {
        turnOnMs: 0,
        turnOffMs: 60_000
      }
    });
    const decision = evaluateThresholdDecision({
      rule,
      state: {
        relayOn: true,
        onHits: 0,
        offHits: 1,
        lastChangeMs: startMs - 1_000,
        onStartedMs: startMs - 1_000,
        relayDebounceState: {
          status: 'pending',
          relayOn: false,
          sinceMs: startMs - 500
        }
      },
      measurement: {
        ...measurement(21, startMs),
        seenAtMs: startMs - rule.staleTimeoutSec * 1000 - 1
      },
      nowMs: startMs
    });

    expect(decision).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: true,
      reason: 'sensor-stale',
      nextState: {
        relayOn: false,
        relayDebounceState: { status: 'idle' }
      }
    });
  });
});
