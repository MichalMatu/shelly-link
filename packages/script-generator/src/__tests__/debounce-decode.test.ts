import {
  createDefaultShellyThermostatConfig,
  decodeShellyThermostatScript,
  generateShellyThermostatScript
} from '../index.js';

describe('relay debounce decode', () => {
  it('round-trips an OFF-only debounce policy', () => {
    const base = createDefaultShellyThermostatConfig();
    const script = generateShellyThermostatScript({
      ...base,
      rule: {
        ...base.rule,
        relayDebounce: {
          turnOnMs: 0,
          turnOffMs: 4_000
        }
      }
    });

    expect(decodeShellyThermostatScript(script)?.settings.relayDebounce).toEqual({
      turnOnMs: 0,
      turnOffMs: 4_000
    });
  });
});
