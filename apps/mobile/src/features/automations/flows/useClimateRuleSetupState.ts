import { useMemo } from 'react';
import {
  deriveClimateRuleState,
  type ClimateRuleDerivationInput
} from '../data/climateRuleConfigDerivation.js';

export const useClimateRuleSetupState = (input: ClimateRuleDerivationInput) => {
  const {
    selectedSensor,
    additionalSensors,
    sensorAggregation,
    rulePreset,
    onThresholdInput,
    offThresholdInput,
    pulseCycleDraft,
    vpdAssistEnabled,
    vpdTargetInput,
    rssiMinInput,
    staleTimeoutMinInput,
    minChangeMinInput,
    maxOnHoursInput
  } = input;

  return useMemo(
    () => deriveClimateRuleState(input),
    [
      additionalSensors,
      maxOnHoursInput,
      minChangeMinInput,
      offThresholdInput,
      onThresholdInput,
      pulseCycleDraft,
      rssiMinInput,
      rulePreset,
      selectedSensor,
      sensorAggregation,
      staleTimeoutMinInput,
      vpdAssistEnabled,
      vpdTargetInput
    ]
  );
};
