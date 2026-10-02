import type { PulseCycleConfig } from '../actions/pulseCycle.js';
import type { DailyTimeAutomationConfig } from './schedule.js';

export interface TimePulseAutomationConfig {
  schedule: DailyTimeAutomationConfig;
  pulse: PulseCycleConfig;
}
