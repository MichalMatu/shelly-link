#!/usr/bin/env bash
set -euo pipefail
EXPECTED='f55584d10dec5a2e6881657ef883d79b5d120a3c'
BRANCH='work/pulse-v1-source-headroom-20261001'
PATCH='/Users/michal/agent-workspace/repos/shelly-link/checkpoints/pulse-source-headroom-20261001-906/1790845961159018000-task-exit/tracked.patch'
git fetch --prune origin "$BRANCH"
[[ "$(git rev-parse origin/$BRANCH)" == "$EXPECTED" ]]
git reset --hard "$EXPECTED"
git apply "$PATCH"
python3 <<'PY'
from pathlib import Path
p=Path('packages/script-generator/src/shelly/generate.ts')
s=p.read_text()
old="import { GENERATOR_VERSION, normalizeConfig } from './config.js';"
assert old in s
p.write_text(s.replace(old,"import { normalizeConfig } from './config.js';"))
PY
pnpm exec prettier --write packages/script-generator/src/shelly/generate.ts
pnpm --filter @lcl/script-generator test
pnpm --filter @lcl/script-generator typecheck
pnpm --filter @lcl/script-generator lint
cat > .pulse-size-audit.ts <<'TS'
import {createDefaultShellyThermostatConfig,generateShellyThermostatScript} from './packages/script-generator/src/index.ts';
const bytes=(s:string)=>new TextEncoder().encode(s).length;
const max='X'.repeat(26); const base=createDefaultShellyThermostatConfig('xiaomi_lywsd03mmc_bthome_v2','heating');
const cfg={...base,sensor:{...base.sensor,displayName:max},sensorSet:{aggregation:'avg' as const,additionalSensors:[
{...base.sensor,sensorId:'s2',runtimeAddress:'11:22:33:44:55:66',displayName:max},
{...base.sensor,sensorId:'s3',runtimeAddress:'22:33:44:55:66:77',displayName:max},
{...base.sensor,sensorId:'s4',runtimeAddress:'33:44:55:66:77:88',displayName:max}]},rule:{...base.rule,minimumOnMs:60000,relayDebounce:{turnOnMs:5000,turnOffMs:5000},vpdAssist:{enabled:true,targetKpa:1.25}}};
const script=generateShellyThermostatScript(cfg); console.log('WORST_BYTES|'+bytes(script)); console.log('HEADROOM|'+(9500-bytes(script))); console.log('PERSIST_LOADER|'+script.includes('Script.storage.getItem('));
TS
pnpm exec tsx .pulse-size-audit.ts
rm .pulse-size-audit.ts
git status --short
git add packages/script-generator
git commit -m 'Remove unused Climate runtime config loader'
git push origin HEAD:$BRANCH
echo "PULSE_SOURCE_HEADROOM_READY|$(git rev-parse HEAD)"
