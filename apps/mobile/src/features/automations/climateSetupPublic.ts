import { deriveClimateRuleState } from './data/climateRuleConfigDerivation.js';
import { useClimateRuleSetupState } from './flows/useClimateRuleSetupState.js';

export const ClimateSetup = {
  deriveRuleState: deriveClimateRuleState,
  useRuleState: useClimateRuleSetupState
} as const;
