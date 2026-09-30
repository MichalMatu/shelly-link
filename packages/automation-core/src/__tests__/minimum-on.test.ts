import {
  DEFAULT_HEATING_RULE,
  evaluateThresholdDecision,
  type ThermostatRule
} from '../index.js';

const nowMs = 1_000_000;
const rule: ThermostatRule = {
  ...DEFAULT_HEATING_RULE,
  consecutiveHits: 1,
  minimumOnMs: 60_000
};

const hotMeasurement = {
  temperatureC: 21,
  humidityPct: 45,
  rssi: -60,
  seenAtMs: nowMs
};

describe('thermostat minimum ON timing', () => {
  it('keeps AUTO relay ON until minimumOnMs has elapsed', () => {
    const blocked = evaluateThresholdDecision({
      rule,
      state: {
        relayOn: true,
        onHits: 0,
        offHits: 0,
        lastChangeMs: nowMs - 59_999,
        onStartedMs: nowMs - 59_999
      },
      measurement: hotMeasurement,
      nowMs
    });

    expect(blocked).toMatchObject({
      requestedRelayOn: true,
      shouldCallRelay: false,
      reason: 'min-change-blocked'
    });

    const allowed = evaluateThresholdDecision({
      rule,
      state: {
        ...blocked.nextState,
        lastChangeMs: nowMs - 60_000,
        onStartedMs: nowMs - 60_000
      },
      measurement: hotMeasurement,
      nowMs
    });

    expect(allowed).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: true,
      reason: 'above-threshold'
    });
  });

  it('does not let minimum ON delay fail-safe stale OFF', () => {
    const stale = evaluateThresholdDecision({
      rule,
      state: {
        relayOn: true,
        onHits: 0,
        offHits: 0,
        lastChangeMs: nowMs - 1_000,
        onStartedMs: nowMs - 1_000
      },
      measurement: {
        ...hotMeasurement,
        seenAtMs: nowMs - rule.staleTimeoutSec * 1000 - 1
      },
      nowMs
    });

    expect(stale).toMatchObject({
      requestedRelayOn: false,
      shouldCallRelay: true,
      reason: 'sensor-stale'
    });
  });
});
