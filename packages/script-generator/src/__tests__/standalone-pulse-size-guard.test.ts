import type { StandalonePulseAutomationConfig } from '@lcl/automation-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateShellyStandalonePulseScript,
  SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES
} from '../index.js';

const config: StandalonePulseAutomationConfig = {
  relayId: 0,
  pulse: {
    onMs: 1_000,
    offMs: 2_000,
    initialDelayMs: 0,
    startPhase: 'on',
    execution: { mode: 'continuous' }
  }
};

afterEach(() => vi.unstubAllGlobals());

describe('Standalone Pulse generated-size guard', () => {
  it('rejects generated source above the accepted 12 KB hard limit', () => {
    class OversizeTextEncoder {
      encode(): Uint8Array {
        return new Uint8Array(SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES + 1);
      }
    }

    vi.stubGlobal('TextEncoder', OversizeTextEncoder);

    expect(() => generateShellyStandalonePulseScript(config)).toThrowError(
      'Standalone Pulse generated script exceeds the 12000 B hard limit.'
    );
  });
});
