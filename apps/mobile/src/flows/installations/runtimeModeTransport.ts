import { unwrapShellyResult } from '../../platform/shellyResult.js';
import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { RPC_METHODS } from '@lcl/shelly-client';
import { z } from 'zod';

import type { ClimateInstalledAutomation } from './model.js';

export type InstalledAutomationRuntimeMode =
  | 'auto'
  | 'manual-off'
  | 'manual-on'
  | 'paused'
  | 'fault';

export type SettableInstalledAutomationRuntimeMode = Exclude<
  InstalledAutomationRuntimeMode,
  'fault'
>;

export type InstalledAutomationRuntimeModeState = {
  mode: InstalledAutomationRuntimeMode;
  supported: boolean;
};

const scriptEvalResponseSchema = z.object({ result: z.string() });

const runtimeModeCode: Record<InstalledAutomationRuntimeMode, number> = {
  auto: 0,
  'manual-off': 1,
  'manual-on': 2,
  paused: 3,
  fault: 4
};

const runtimeModeEvalCode: Record<SettableInstalledAutomationRuntimeMode, string> = {
  'manual-off':
    '(function(){if(R.m===4)return R.m;R.m=1;R.nh=R.fh=0;R.rs="mn";if(R.on)sw(false,"mn",1);return R.m})()',
  'manual-on':
    '(function(){if(R.m===4)return R.m;var n=nw();if(!R.ls||n-R.ls>C.s){ft("st");return R.m}R.m=2;R.nh=R.fh=0;R.rs="mn";if(!R.on)sw(true,"mn",1);return R.m})()',
  paused:
    '(function(){if(R.m===4)return R.m;R.m=3;R.nh=R.fh=0;R.rs="pa";if(R.on)sw(false,"pa",1);return R.m})()',
  auto: '(function(){if(R.m===4)return R.m;R.m=0;R.nh=R.fh=0;R.rs="ar";return R.m})()'
};

const readModeEvalCode = 'typeof R==="object"&&typeof R.m==="number"?R.m:-1';

const evaluateRuntime = async (
  installation: ClimateInstalledAutomation,
  code: string
): Promise<string> => {
  const transport = createShellyTransport(installation.shelly.baseUrl);
  const payload = unwrapShellyResult(
    await transport.call<unknown>({
      method: RPC_METHODS.ScriptEval,
      params: { id: installation.script.id, code }
    })
  );
  return scriptEvalResponseSchema.parse(payload).result;
};

const runtimeModeFromResult = (result: string): InstalledAutomationRuntimeMode | null => {
  const entry = Object.entries(runtimeModeCode).find(([, value]) => String(value) === result);
  return (entry?.[0] as InstalledAutomationRuntimeMode | undefined) ?? null;
};

export const readInstalledAutomationRuntimeMode = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationRuntimeModeState> => {
  const result = await evaluateRuntime(installation, readModeEvalCode);
  const mode = runtimeModeFromResult(result);
  return mode ? { mode, supported: true } : { mode: 'auto', supported: false };
};

export const setInstalledAutomationRuntimeMode = async (
  installation: ClimateInstalledAutomation,
  mode: SettableInstalledAutomationRuntimeMode
): Promise<void> => {
  const result = await evaluateRuntime(installation, runtimeModeEvalCode[mode]);
  const expected = String(runtimeModeCode[mode]);
  if (result !== expected) {
    const actual = runtimeModeFromResult(result);
    throw new Error(
      actual === 'fault'
        ? `Shelly runtime entered FAULT while requesting ${mode.toUpperCase()}.`
        : `Shelly did not confirm ${mode.toUpperCase()} runtime mode.`
    );
  }
};
