#!/usr/bin/env bash
set -euo pipefail
BRANCH='pulse-v1-runtime-integration'
git fetch --prune origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
pnpm --filter @lcl/script-generator typecheck
pnpm --filter @lcl/script-generator test
pnpm exec tsx <<'TS'
import { createDefaultShellyThermostatConfig, generateShellyThermostatScript, SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES } from './packages/script-generator/src/index.ts';
const bytes=(v:string)=>new TextEncoder().encode(v).length;
const pulse={onMs:86_400_000,offMs:86_400_000,initialDelayMs:86_400_000,startPhase:'off' as const,execution:{mode:'duration' as const,durationMs:604_800_000}};
const window={startTime:'23:59',endTime:'00:01'};
const profiles=['xiaomi_lywsd03mmc_bthome_v2','tp357_custom_v1'] as const;
const withFour=(base:ReturnType<typeof createDefaultShellyThermostatConfig>, mixed=false)=>{
  const all=[0,1,2,3].map((i)=>({
    ...base.sensor,
    profileId: mixed && i%2 ? profiles[1] : base.sensor.profileId,
    sensorId:`sensor-${i+1}`,
    runtimeAddress:`AA:BB:CC:DD:EE:${String(10+i).padStart(2,'0')}`,
    displayName:`S${String(i+1)}-${'X'.repeat(23)}`
  }));
  return {...base,sensor:all[0]!,sensorSet:{aggregation:'avg' as const,additionalSensors:all.slice(1)}};
};
const worstRule=(base:ReturnType<typeof createDefaultShellyThermostatConfig>)=>({
  ...base.rule,
  vpdAssist:{enabled:true,targetKpa:4.999},
  minimumOnMs:86_400_000,
  relayDebounce:{turnOnMs:86_400_000,turnOffMs:86_400_000},
  staleTimeoutSec:86_400,
  minChangeMs:86_400_000,
  maxOnMs:604_800_000,
  rssiMin:-100,
  consecutiveHits:10
});
const measure=(label:string,config:unknown)=>{
  try { const size=bytes(generateShellyThermostatScript(config)); console.log(`${label}|${size}|headroom=${SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES-size}`); }
  catch(error){ console.log(`${label}|ERROR|${error instanceof Error?error.message:String(error)}`); process.exitCode=1; }
};
console.log(`guard|${SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES}`);
const steady=createDefaultShellyThermostatConfig();
measure('steady',steady);
measure('pulse',{...steady,execution:{pulse}});
measure('window',{...steady,execution:{activeWindow:window}});
measure('pulse-window',{...steady,execution:{pulse,activeWindow:window}});
for (const profile of profiles) {
  for (const mode of ['heating','humidifying'] as const) {
    const base=withFour(createDefaultShellyThermostatConfig(profile,mode));
    measure(`worst-${profile}-${mode}`,{...base,rule:worstRule(base),execution:{pulse,activeWindow:window}});
  }
}
const mixedBase=withFour(createDefaultShellyThermostatConfig('xiaomi_lywsd03mmc_bthome_v2','heating'),true);
measure('worst-mixed',{...mixedBase,rule:worstRule(mixedBase),execution:{pulse,activeWindow:window}});
TS
