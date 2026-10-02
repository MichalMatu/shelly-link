import type {
  PulseCycleConfig,
  StandalonePulseAutomationConfig
} from '@lcl/automation-core';
import { z } from 'zod';
import { pulseCycleConfigSchema } from './config.js';
import { stableStringify } from './hash.js';
import { renderPulseCycleExecution } from './runtime/execution.js';
import { compactGeneratedShellyScript } from './scriptText.js';

export const SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES = 12_000;

export const standalonePulseAutomationConfigSchema = z.object({
  relayId: z.number().int().min(0),
  pulse: pulseCycleConfigSchema
});

export type ShellyStandalonePulseAutomationConfig = z.infer<
  typeof standalonePulseAutomationConfigSchema
>;

type StandalonePulseRuntimeConfig = {
  i: number;
  e: [number, number, number, 0 | 1, number];
};

const runtimePulse = (pulse: PulseCycleConfig): StandalonePulseRuntimeConfig['e'] => [
  pulse.onMs,
  pulse.offMs,
  pulse.initialDelayMs,
  pulse.startPhase === 'off' ? 1 : 0,
  pulse.execution.mode === 'continuous'
    ? 0
    : pulse.execution.mode === 'cycles'
      ? pulse.execution.count
      : -pulse.execution.durationMs
];

const runtimeConfig = (
  config: StandalonePulseAutomationConfig
): StandalonePulseRuntimeConfig => ({
  i: config.relayId,
  e: runtimePulse(config.pulse)
});

const renderStandalonePulseRelay =
  (): string => `function ff(){if(R.ri)Timer.clear(R.ri);Shelly.call("Switch.Set",{id:C.i,on:false},function(x,e){if(e){R.ri=Timer.set(1000,false,ff);return}R.ri=0;R.on=false})}
function sw(o,q){R.a=o;R.rs=q;if(R.on===o)return;Shelly.call("Switch.Set",{id:C.i,on:o},function(x,e){if(e){R.af="rc";cx();ff();return}R.on=o})}
function ft(q){R.af=q||"sf";cx();R.a=false;ff()}`;

const renderStandalonePulseControl = (): string =>
  `function rq(o){if(!o){var p=R.ps>0&&R.ps<4;cx();R.a=false;sw(false,p?"pp":"po");return 0}if(R.af)return-1;px();return 1}`;

const renderStandalonePulseBoot =
  (): string => `function bt(){Shelly.call("Switch.Set",{id:C.i,on:false},function(x,e){if(e){R.af="rc";ff();return}R.on=false;var s=Shelly.getComponentStatus("switch:"+C.i);if(s&&s.errors&&s.errors[0]){ft(s.errors[0]);return}rq(true)})}
if(Shelly.addEventHandler)Shelly.addEventHandler(function(e){if(e&&e.component==="switch:"+C.i&&e.delta&&e.delta.errors&&e.delta.errors[0])ft(e.delta.errors[0])});
bt();`;

export const standalonePulseControlEvalCode = (active: boolean): string =>
  `rq(${active ? 'true' : 'false'})`;

export const generateShellyStandalonePulseScript = (input: unknown): string => {
  const config = standalonePulseAutomationConfigSchema.parse(
    input
  ) as StandalonePulseAutomationConfig;
  const sourceConfig = stableStringify(config);
  const compactConfig = stableStringify(runtimeConfig(config));
  const body = `var C=${compactConfig};
var R={on:false,a:false,af:null,rs:"bt",ps:0,pc:0,pt:null,pn:null,pi:0,ri:0};
function nw(){return Shelly.getUptimeMs()}
${renderStandalonePulseRelay()}
${renderPulseCycleExecution()}
${renderStandalonePulseControl()}
${renderStandalonePulseBoot()}`;
  const script = `// g: 0.7.1\n// m: standalone-pulse-v1\n// c: ${sourceConfig}\n${compactGeneratedShellyScript(body)}\n`;
  if (
    new TextEncoder().encode(script).length > SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES
  ) {
    throw new RangeError(
      'Standalone Pulse generated script exceeds the 12000 B hard limit.'
    );
  }
  return script;
};

export const decodeShellyStandalonePulseScript = (
  script: string
): ShellyStandalonePulseAutomationConfig | null => {
  const line = script.split('\n').find((entry) => entry.startsWith('// c: '));
  if (!line) return null;
  try {
    const parsed = JSON.parse(line.slice(6)) as unknown;
    const result = standalonePulseAutomationConfigSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
