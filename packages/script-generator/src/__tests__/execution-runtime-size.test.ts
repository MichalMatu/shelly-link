import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript,
  SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES,
  type ShellyThermostatConfig
} from '../index.js';

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

const pulse = {
  onMs: 86_400_000,
  offMs: 86_400_000,
  initialDelayMs: 86_400_000,
  startPhase: 'off' as const,
  execution: {
    mode: 'duration' as const,
    durationMs: 604_800_000
  }
};

const activeWindow = {
  startTime: '23:59',
  endTime: '00:01'
};

const withFourMixedSensors = (
  base: ShellyThermostatConfig
): ShellyThermostatConfig => {
  const sensors: ShellyThermostatConfig['sensor'][] = [0, 1, 2, 3].map((index) => ({
    ...base.sensor,
    profileId:
      index % 2 === 0 ? 'xiaomi_lywsd03mmc_bthome_v2' : 'tp357_custom_v1',
    sensorId: `sensor-${index + 1}`,
    runtimeAddress: `AA:BB:CC:DD:EE:${String(10 + index).padStart(2, '0')}`,
    displayName: `S${index + 1}-${'X'.repeat(23)}`
  }));

  return {
    ...base,
    sensor: sensors[0]!,
    sensorSet: {
      aggregation: 'avg',
      additionalSensors: sensors.slice(1)
    }
  };
};

describe('Pulse execution runtime size budget', () => {
  it('uses the accepted 12 KB hard ceiling', () => {
    expect(SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES).toBe(12_000);
  });

  it('keeps the supported mixed-parser worst case inside the ceiling', () => {
    const base = withFourMixedSensors(createDefaultShellyThermostatConfig());
    const config: ShellyThermostatConfig = {
      ...base,
      rule: {
        ...base.rule,
        vpdAssist: {
          enabled: true,
          targetKpa: 4.999
        },
        minimumOnMs: 86_400_000,
        relayDebounce: {
          turnOnMs: 86_400_000,
          turnOffMs: 86_400_000
        },
        staleTimeoutSec: 86_400,
        minChangeMs: 86_400_000,
        maxOnMs: 604_800_000,
        rssiMin: -100,
        consecutiveHits: 10
      },
      execution: {
        pulse,
        activeWindow
      }
    };

    const script = generateShellyThermostatScript(config);

    expect(byteLength(script)).toBeLessThanOrEqual(SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES);
    expect(script).toContain('function pb(');
    expect(script).toContain('function pt(');
    expect(script).toContain('function px(');
    expect(script).toContain('function wu(');
  });
});
