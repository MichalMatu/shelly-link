import {
  createDefaultShellyThermostatConfig,
  generateShellyThermostatScript,
  MAX_CLIMATE_SENSOR_DISPLAY_NAME_RUNTIME_BYTES,
  SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES,
  type ShellyThermostatConfig
} from '../index.js';

type SensorProfileId = ShellyThermostatConfig['sensor']['profileId'];
type RuleMode = ShellyThermostatConfig['rule']['mode'];

const profiles = [
  'xiaomi_lywsd03mmc_bthome_v2',
  'tp357_custom_v1'
] as const satisfies readonly SensorProfileId[];
const modes = [
  'heating',
  'cooling',
  'humidifying',
  'dehumidifying'
] as const satisfies readonly RuleMode[];
const additionalRuntimeAddresses = [
  'AA:00:00:00:00:01',
  'AA:00:00:00:00:02',
  'AA:00:00:00:00:03'
] as const;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;
const runtimeStringByteLength = (value: string): number =>
  byteLength(JSON.stringify(value)) - 2;

const maximumFeatureConfig = ({
  sensorProfileId,
  mode,
  vpdAssistEnabled,
  displayName
}: {
  sensorProfileId: SensorProfileId;
  mode: RuleMode;
  vpdAssistEnabled: boolean;
  displayName: string;
}) => {
  const base = createDefaultShellyThermostatConfig(sensorProfileId, mode);
  return {
    ...base,
    sensor: { ...base.sensor, displayName },
    sensorSet: {
      aggregation: 'avg' as const,
      additionalSensors: additionalRuntimeAddresses.map((runtimeAddress, index) => ({
        ...base.sensor,
        sensorId: `sensor-${index + 2}`,
        runtimeAddress,
        displayName
      }))
    },
    rule: {
      ...base.rule,
      minimumOnMs: 60_000,
      relayDebounce: { turnOnMs: 5_000, turnOffMs: 5_000 },
      vpdAssist: { enabled: vpdAssistEnabled, targetKpa: 1.25 }
    }
  };
};

describe('Climate sensor display-name runtime budget', () => {
  it('keeps every supported maximum-feature runtime inside the fixed script budget', () => {
    const displayName = 'X'.repeat(MAX_CLIMATE_SENSOR_DISPLAY_NAME_RUNTIME_BYTES);

    for (const sensorProfileId of profiles) {
      for (const mode of modes) {
        for (const vpdAssistEnabled of [false, true]) {
          const script = generateShellyThermostatScript(
            maximumFeatureConfig({ sensorProfileId, mode, vpdAssistEnabled, displayName })
          );
          expect(byteLength(script)).toBeLessThanOrEqual(
            SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES
          );
        }
      }
    }
  });

  it('bounds names by escaped UTF-8 runtime bytes rather than character count', () => {
    const exactEscapedName = '\\'.repeat(13);
    const tooLargeEscapedName = '\\'.repeat(14);
    const base = createDefaultShellyThermostatConfig();

    expect(runtimeStringByteLength(exactEscapedName)).toBe(
      MAX_CLIMATE_SENSOR_DISPLAY_NAME_RUNTIME_BYTES
    );
    expect(() =>
      generateShellyThermostatScript({
        ...base,
        sensor: { ...base.sensor, displayName: exactEscapedName }
      })
    ).not.toThrow();

    expect(tooLargeEscapedName).toHaveLength(14);
    expect(runtimeStringByteLength(tooLargeEscapedName)).toBe(28);
    expect(() =>
      generateShellyThermostatScript({
        ...base,
        sensor: { ...base.sensor, displayName: tooLargeEscapedName }
      })
    ).toThrow('Climate sensor display name must use at most 26 runtime bytes.');
  });
});
