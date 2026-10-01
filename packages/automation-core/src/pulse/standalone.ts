import type { PulseCycleConfig } from '../actions/pulseCycle.js';

export interface StandalonePulseAutomationConfig {
  relayId: number;
  pulse: PulseCycleConfig;
}
