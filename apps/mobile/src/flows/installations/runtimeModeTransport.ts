import {
  climateRuntimeControlStateEvalCode,
  climateRuntimeRestoreControlStateEvalCode,
  climateRuntimeResetSafetyLockoutEvalCode,
  climateRuntimeSetControlModeEvalCode,
  climateRuntimeSetManualRelayEvalCode,
  decodeClimateRuntimeControlState,
  decodeShellyStandalonePulseScript,
  decodeShellyThermostatScript,
  type ClimateRuntimeControlMode,
  type ClimateRuntimeControlState
} from '@lcl/script-generator';
import {
  RPC_METHODS,
  RpcShellyClient,
  readShellyScriptCode,
  readShellyScriptList,
  switchStatusSchema,
  type ShellyRpcTransport,
  type ShellyScriptListEntry
} from '@lcl/shelly-client';
import { z } from 'zod';

import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../platform/shellyResult.js';
import type { ClimateInstalledAutomation } from './model.js';

export type InstalledAutomationRuntimeMode = ClimateRuntimeControlMode;

export type InstalledAutomationRuntimeModeState = ClimateRuntimeControlState & {
  supported: boolean;
};

export type ManagedAutomationDiscoveryRestoreState =
  | {
      kind: 'none';
      scriptId: null;
      wasRunning: false;
      relayId: 0;
    }
  | {
      kind: 'climate';
      scriptId: number;
      wasRunning: boolean;
      relayId: number;
      controlState: ClimateRuntimeControlState | null;
    }
  | {
      kind: 'standalone-pulse';
      scriptId: number;
      wasRunning: boolean;
      relayId: number;
      manualRelayOn: boolean | null;
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
  transport: ShellyRpcTransport,
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

const findManagedScript = (
  scripts: ShellyScriptListEntry[]
): ShellyScriptListEntry | null => {
  const candidates = scripts.filter((script) => script.enable || script.running);
  if (candidates.length > 1) {
    throw new Error(
      'Multiple active Shelly scripts prevent safe managed automation preservation.'
    );
  }
  return candidates[0] ?? null;
};

const readRelayOutput = async (
  transport: ShellyRpcTransport,
  relayId: number
): Promise<boolean> => {
  const result = unwrapShellyResult(
    await transport.call<unknown>({
      method: RPC_METHODS.SwitchGetStatus,
      params: { id: relayId }
    })
  );
  return switchStatusSchema.parse(result).output;
};

export const readClimateRuntimeControlState = async (
  transport: ShellyRpcTransport,
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
  transport: ShellyRpcTransport,
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

export const captureManagedAutomationDiscoveryRestoreState = async (
  transport: ShellyRpcTransport
): Promise<ManagedAutomationDiscoveryRestoreState> => {
  const scripts = unwrapShellyResult(await readShellyScriptList(transport));
  const script = findManagedScript(scripts);
  if (!script) {
    return { kind: 'none', scriptId: null, wasRunning: false, relayId: 0 };
  }

  const code = unwrapShellyResult(await readShellyScriptCode(transport, script.id));
  const standalonePulse = decodeShellyStandalonePulseScript(code);
  if (standalonePulse) {
    return {
      kind: 'standalone-pulse',
      scriptId: script.id,
      wasRunning: script.running,
      relayId: standalonePulse.relayId,
      manualRelayOn: script.running
        ? null
        : await readRelayOutput(transport, standalonePulse.relayId)
    };
  }

  const climate = decodeShellyThermostatScript(code);
  if (climate) {
    return {
      kind: 'climate',
      scriptId: script.id,
      wasRunning: script.running,
      relayId: climate.settings.relayId,
      controlState: script.running
        ? await readClimateRuntimeControlState(transport, script.id)
        : null
    };
  }

  if (script.running) {
    throw new Error(
      'Managed automation runtime does not support safe state preservation.'
    );
  }
  return { kind: 'none', scriptId: null, wasRunning: false, relayId: 0 };
};

const readManagedScriptRunning = async (
  transport: ShellyRpcTransport,
  scriptId: number
): Promise<boolean> => {
  const scripts = unwrapShellyResult(await readShellyScriptList(transport));
  const script = scripts.find((entry) => entry.id === scriptId);
  if (!script) {
    throw new Error('Managed automation script disappeared during BLE discovery.');
  }
  return script.running;
};

export const leaveManagedAutomationDiscoverySafe = async (
  transport: ShellyRpcTransport,
  state: ManagedAutomationDiscoveryRestoreState
): Promise<void> => {
  const client = new RpcShellyClient(transport);
  if (state.scriptId !== null) {
    try {
      unwrapShellyResult(await client.stopScript(state.scriptId));
    } catch {
      // Best effort only; preserve the original preparation/restore failure.
    }
  }
  try {
    unwrapShellyResult(await client.setRelayOff({ relayId: state.relayId }));
  } catch {
    // Best effort only; preserve the original preparation/restore failure.
  }
};

export const restoreManagedAutomationDiscoveryState = async (
  transport: ShellyRpcTransport,
  state: ManagedAutomationDiscoveryRestoreState
): Promise<void> => {
  if (state.kind === 'none') return;

  const client = new RpcShellyClient(transport);
  const running = await readManagedScriptRunning(transport, state.scriptId);

  if (state.kind === 'climate') {
    if (!state.wasRunning) {
      if (running) {
        unwrapShellyResult(await client.stopScript(state.scriptId));
      }
      return;
    }
    if (!state.controlState) {
      throw new Error('Managed automation state was not captured before BLE discovery.');
    }
    if (!running) {
      unwrapShellyResult(await client.startScript(state.scriptId));
    }
    await restoreClimateRuntimeControlState(
      transport,
      state.scriptId,
      state.controlState
    );
    return;
  }

  if (state.wasRunning) {
    if (!running) {
      unwrapShellyResult(await client.startScript(state.scriptId));
    }
    return;
  }
  if (state.manualRelayOn === null) {
    throw new Error(
      'Standalone Pulse manual relay state was not captured before BLE discovery.'
    );
  }
  if (running) {
    unwrapShellyResult(await client.stopScript(state.scriptId));
  }

  unwrapShellyResult(
    state.manualRelayOn
      ? await client.setRelayOn({ relayId: state.relayId })
      : await client.setRelayOff({ relayId: state.relayId })
  );
  const confirmed = await readRelayOutput(transport, state.relayId);
  if (confirmed !== state.manualRelayOn) {
    throw new Error('Shelly did not restore the standalone Pulse manual relay state.');
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
