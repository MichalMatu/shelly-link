import {
  parseClockMinutes,
  type PulseCycleConfig,
  type TimePulseAutomationConfig
} from '@lcl/automation-core';
import { z } from 'zod';
import { pulseCycleConfigSchema } from './config.js';
import { stableStringify } from './hash.js';
import { renderPulseCycleExecution } from './runtime/execution.js';
import { compactGeneratedShellyScript } from './scriptText.js';

const clockTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dailyTimeAutomationConfigSchema = z
  .object({
    relayId: z.number().int().min(0),
    onTime: z.string().regex(clockTimePattern),
    offTime: z.string().regex(clockTimePattern)
  })
  .refine((value) => value.onTime !== value.offTime, {
    message: 'Time automation ON and OFF times must be different.',
    path: ['offTime']
  });

export const timePulseAutomationConfigSchema = z.object({
  schedule: dailyTimeAutomationConfigSchema,
  pulse: pulseCycleConfigSchema
});

export type ShellyTimePulseAutomationConfig = z.infer<
  typeof timePulseAutomationConfigSchema
>;

type TimePulseRuntimeConfig = {
  i: number;
  w: [number, number];
  e: [number, number, number, 0 | 1, number];
};

const runtimePulse = (pulse: PulseCycleConfig): TimePulseRuntimeConfig['e'] => [
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

const runtimeConfig = (config: TimePulseAutomationConfig): TimePulseRuntimeConfig => ({
  i: config.schedule.relayId,
  w: [
    parseClockMinutes(config.schedule.onTime)!,
    parseClockMinutes(config.schedule.offTime)!
  ],
  e: runtimePulse(config.pulse)
});

const renderTimePulseRelay =
  (): string => `function ff(){if(R.ri)Timer.clear(R.ri);Shelly.call("Switch.Set",{id:C.i,on:false},function(x,e){if(e){R.ri=Timer.set(1000,false,ff);return}R.ri=0;R.on=false})}
function sw(o,q){R.a=o;R.rs=q;if(R.on===o)return;Shelly.call("Switch.Set",{id:C.i,on:o},function(x,e){if(e){R.af="rc";cx();ff();return}R.on=o})}
function ft(q){R.af=q||"sf";cx();R.a=false;ff()}`;

const renderTimePulseGate = (): string =>
  `function rq(o){if(!o){var p=R.ps>0&&R.ps<4;cx();R.a=false;sw(false,p?"pp":"pw");return 0}if(R.af)return-1;px();return 1}
function bw(){var y=Shelly.getComponentStatus("sys"),t=y&&y.time,u=y&&y.unixtime,m=t?(t.slice(0,2)-0)*60+(t.slice(3,5)-0):-1,a=C.w[0],b=C.w[1];if(!u||u<1600000000||m<0||m>1439||m!==m){if(!R.af||R.af==="tm")R.af="tm";rq(false);Timer.set(30000,false,bw);return}if(R.af==="tm")R.af=null;if(R.af)return;rq(a<b?m>=a&&m<b:m>=a||m<b)}`;

const renderTimePulseBoot =
  (): string => `function bt(){Shelly.call("Switch.Set",{id:C.i,on:false},function(x,e){if(e){R.af="rc";ff();return}R.on=false;var s=Shelly.getComponentStatus("switch:"+C.i);if(s&&s.errors&&s.errors[0]){ft(s.errors[0]);return}bw()})}
if(Shelly.addEventHandler)Shelly.addEventHandler(function(e){if(e&&e.component==="switch:"+C.i&&e.delta&&e.delta.errors&&e.delta.errors[0])ft(e.delta.errors[0])});
bt();`;

export const timePulseScheduleEvalCode = (active: boolean): string =>
  `rq(${active ? 'true' : 'false'})`;

export const generateShellyTimePulseScript = (input: unknown): string => {
  const config = timePulseAutomationConfigSchema.parse(
    input
  ) as TimePulseAutomationConfig;
  const sourceConfig = stableStringify(config);
  const compactConfig = stableStringify(runtimeConfig(config));
  const body = `var C=${compactConfig};
var R={on:false,a:false,af:null,rs:"bt",ps:0,pc:0,pt:null,pn:null,pi:0,ri:0};
function nw(){return Shelly.getUptimeMs()}
${renderTimePulseRelay()}
${renderPulseCycleExecution()}
${renderTimePulseGate()}
${renderTimePulseBoot()}`;
  return `// g: 0.7.1\n// m: time-pulse-v1\n// c: ${sourceConfig}\n${compactGeneratedShellyScript(body)}\n`;
};

export const decodeShellyTimePulseScript = (
  script: string
): ShellyTimePulseAutomationConfig | null => {
  const line = script.split('\n').find((entry) => entry.startsWith('// c: '));
  if (!line) return null;
  try {
    const parsed = JSON.parse(line.slice(6)) as unknown;
    const result = timePulseAutomationConfigSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
