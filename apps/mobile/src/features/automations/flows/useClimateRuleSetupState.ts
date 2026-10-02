import { useMemo } from 'react';
import {
  deriveClimateRuleState,
  type ClimateRuleDerivationInput
} from '../data/climateRuleConfigDerivation.js';

export const useClimateRuleSetupState = ({
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
}: ClimateRuleDerivationInput) =>
  useMemo(
    () =>
      deriveClimateRuleState({
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
      }),
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
