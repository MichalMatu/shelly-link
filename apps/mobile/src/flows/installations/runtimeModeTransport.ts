import {
  climateRuntimeControlStateEvalCode,
  climateRuntimeRestoreControlStateEvalCode,
  climateRuntimeResetSafetyLockoutEvalCode,
  climateRuntimeSetControlModeEvalCode,
  climateRuntimeSetManualRelayEvalCode,
  decodeClimateRuntimeControlState,
  type ClimateRuntimeControlMode,
  type ClimateRuntimeControlState
} from '@lcl/script-generator';
import { RPC_METHODS, type FetchShellyRpcTransport } from '@lcl/shelly-client';
import { z } from 'zod';

import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../platform/shellyResult.js';
import type { ClimateInstalledAutomation } from './model.js';

export type InstalledAutomationRuntimeMode = ClimateRuntimeControlMode;

export type InstalledAutomationRuntimeModeState = ClimateRuntimeControlState & {
  supported: boolean;
};

const scriptEvalResponseSchema = z.object({ result: z.string() });

const unsupportedRuntimeState = (): InstalledAutomationRuntimeModeState => ({
  mode: 'auto',
  manualRequestOn: false,
  automationFault: null,
  safetyLockout: false,
  safetyReason: null,
  supported: false
});

const evaluateRuntimeTransport = async (
  transport: FetchShellyRpcTransport,
  scriptId: number,
  code: string
): Promise<string> => {
  const payload = unwrapShellyResult(
    await transport.call<unknown>({
      method: RPC_METHODS.ScriptEval,
      params: { id: scriptId, code }
    })
  );
  return scriptEvalResponseSchema.parse(payload).result;
};

const evaluateRuntime = async (
  installation: ClimateInstalledAutomation,
  code: string
): Promise<string> =>
  evaluateRuntimeTransport(
    createShellyTransport(installation.shelly.baseUrl),
    installation.script.id,
    code
  );

export const readClimateRuntimeControlState = async (
  transport: FetchShellyRpcTransport,
  scriptId: number
): Promise<ClimateRuntimeControlState> => {
  const state = decodeClimateRuntimeControlState(
    await evaluateRuntimeTransport(
      transport,
      scriptId,
      climateRuntimeControlStateEvalCode
    )
  );
  if (!state) {
    throw new Error(
      'Managed automation runtime does not support safe state preservation.'
    );
  }
  return state;
};

export const restoreClimateRuntimeControlState = async (
  transport: FetchShellyRpcTransport,
  scriptId: number,
  expected: ClimateRuntimeControlState
): Promise<void> => {
  const restored = decodeClimateRuntimeControlState(
    await evaluateRuntimeTransport(
      transport,
      scriptId,
      climateRuntimeRestoreControlStateEvalCode(expected)
    )
  );
  if (
    !restored ||
    restored.mode !== expected.mode ||
    restored.manualRequestOn !== expected.manualRequestOn ||
    restored.automationFault !== expected.automationFault ||
    restored.safetyLockout !== expected.safetyLockout ||
    restored.safetyReason !== expected.safetyReason
  ) {
    throw new Error('Shelly did not restore the managed automation control state.');
  }
};

export const readInstalledAutomationRuntimeMode = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationRuntimeModeState> => {
  const result = await evaluateRuntime(installation, climateRuntimeControlStateEvalCode);
  const state = decodeClimateRuntimeControlState(result);
  return state ? { ...state, supported: true } : unsupportedRuntimeState();
};

export const setInstalledAutomationRuntimeMode = async (
  installation: ClimateInstalledAutomation,
  mode: InstalledAutomationRuntimeMode
): Promise<void> => {
  const result = await evaluateRuntime(
    installation,
    climateRuntimeSetControlModeEvalCode(mode)
  );
  const expected = mode === 'auto' ? '0' : '1';
  if (result === '-2') {
    throw new Error('Shelly runtime safety lockout must be recovered first.');
  }
  if (result !== expected) {
    throw new Error(`Shelly did not confirm ${mode.toUpperCase()} runtime mode.`);
  }
};

export const setInstalledAutomationManualRelayRequest = async (
  installation: ClimateInstalledAutomation,
  on: boolean
): Promise<void> => {
  const result = await evaluateRuntime(
    installation,
    climateRuntimeSetManualRelayEvalCode(on)
  );
  if (result === '-2') {
    throw new Error('Shelly runtime safety lockout must be recovered first.');
  }
  if (result === '-1') {
    throw new Error('Manual relay control requires MANUAL runtime mode.');
  }
  if (result !== (on ? '1' : '0')) {
    throw new Error(`Shelly did not confirm manual relay ${on ? 'ON' : 'OFF'}.`);
  }
};

export const resetInstalledAutomationSafetyLockout = async (
  installation: ClimateInstalledAutomation
): Promise<ClimateRuntimeControlState> => {
  const state = decodeClimateRuntimeControlState(
    await evaluateRuntime(installation, climateRuntimeResetSafetyLockoutEvalCode)
  );
  if (!state || state.safetyLockout || state.manualRequestOn) {
    throw new Error('Shelly did not confirm a safely reset runtime lockout.');
  }
  return state;
};
