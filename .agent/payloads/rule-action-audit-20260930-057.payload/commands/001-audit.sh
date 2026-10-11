set -eu
BASE=7ea649ea91ecc2838dfed06f84e5e9d209c8c983
git merge-base --is-ancestor "$BASE" HEAD
printf '\n== HEAD ==\n'
git rev-parse HEAD
printf '\n== package contracts ==\n'
cat packages/AGENTS.md
printf '\n== core model ==\n'
sed -n '1,240p' packages/automation-core/src/model.ts
printf '\n== threshold decision ==\n'
sed -n '1,320p' packages/automation-core/src/thermostat/heating.ts
printf '\n== runtime config ==\n'
sed -n '1,320p' packages/script-generator/src/shelly/runtimeConfig.ts
printf '\n== generator runtime owners ==\n'
cat packages/script-generator/src/shelly/runtime/state.ts
cat packages/script-generator/src/shelly/runtime/relayArbiter.ts
cat packages/script-generator/src/shelly/runtime/safetySupervisor.ts
sed -n '1,360p' packages/script-generator/src/shelly/generate.ts
printf '\n== existing timing/composition search ==\n'
grep -RInE 'pulse|cooldown|debounce|min(On|Off)|time.?window|condition|consecutiveHits|minChangeMs|Timer\.set|unixtime|Date\(' packages/automation-core packages/script-generator apps/mobile/src/features/automations apps/mobile/src/flows/hardware-setup | head -n 300 || true
printf '\n== baseline focused tests ==\n'
pnpm --filter @lcl/automation-core test
pnpm --filter @lcl/script-generator test
printf '\n== generated size budget ==\n'
cat > /tmp/rule-action-size.ts <<'TS'
import { createDefaultShellyThermostatConfig, generateShellyThermostatScript } from '@lcl/script-generator';
const one = createDefaultShellyThermostatConfig('tp357_custom_v1', 'humidifying');
const four = {
  ...one,
  sensorSet: {
    aggregation: 'avg' as const,
    additionalSensors: [
      { ...one.sensor, sensorId:'s2', runtimeAddress:'11:22:33:44:55:67', displayName:'S2' },
      { ...one.sensor, sensorId:'s3', runtimeAddress:'11:22:33:44:55:68', displayName:'S3' },
      { ...one.sensor, sensorId:'s4', runtimeAddress:'11:22:33:44:55:69', displayName:'S4' }
    ]
  }
};
for (const [name,cfg] of [['one',one],['four',four]] as const) {
  const code=generateShellyThermostatScript(cfg);
  console.log(name,new TextEncoder().encode(code).length);
}
TS
pnpm exec tsx /tmp/rule-action-size.ts
rm -f /tmp/rule-action-size.ts
printf '\n== architecture audit ==\n'
cat <<'TXT'
PRODUCT OWNER: Climate automation rule/action capability.
STATE OWNER: automation-core owns typed rule/action semantics and deterministic state transitions; generated Shelly runtime owns only the compact executable state derived from that model.
SIDE-EFFECT OWNER: script-generator runtime/relayArbiter remains the single relay mutation boundary; timers/clock sampling stay inside generated runtime, not UI.
UI OWNER: no UI change in the first implementation slice; mobile editor should consume typed config only after the runtime contract is stable.
FINAL FILE LAYOUT: extend automation-core with cohesive action/timing model + tests; add a dedicated script-generator runtime action/timing renderer if/when executable behavior is added; extend compact runtime config/decode only for fields proven necessary. Do not grow relayArbiter or generate.ts into a generic rules engine.
TEST OWNER: automation-core table tests for pure semantics; script-generator runtime tests for exact generated behavior, arbiter/safety precedence and 9.5 kB budget; later mobile tests only when editor fields are exposed.

FINDINGS / RECOMMENDED ORDER:
1. Do not implement Pulse, time windows, AND/OR and every timer in one patch. First introduce a typed action request layer with Set ON/OFF and explicit minimum ON / minimum OFF timing, preserving the current final relay arbiter and hard-safety precedence.
2. Current minChangeMs is asymmetric: automation-core/runtime block a transition to ON after a recent change, but OFF remains immediate. Treat it as existing anti-short-cycle/minimum-OFF behavior; do not silently reinterpret it as symmetric minimum ON/OFF.
3. consecutiveHits is threshold sample hysteresis/debounce-by-count and should stay separate from a future explicit time-based debounce operator.
4. Pulse needs runtime-owned expiry state and must request through the arbiter; hard safety, MANUAL/AUTO transitions and faults must cancel/override pulse deterministically.
5. Time windows/scheduled conditions require an explicit trusted-clock contract. Keep them after action/timing primitives; never make phone time or a background phone loop part of execution.
6. AND/OR should compose conditions, not relay side effects. Composition yields an action request; only the existing arbiter may decide the final relay state.
7. Preserve first-fault-wins hard safety and History reason fidelity; new action reasons should be explicit and compact, not overloaded onto safety/automation-fault codes.
8. Runtime byte budget is a hard constraint; use the measured current one/four-sensor sizes to set headroom before adding executable features.

SMALLEST IMPLEMENTATION SLICE:
A. Add explicit typed ActionRequest = Set(on/off) plus TimingPolicy { minimumOnMs, minimumOffMs } in automation-core, with a pure timing gate that returns requested vs applied target and reason.
B. Integrate it into threshold decision without changing default behavior: derive legacy minChangeMs into minimumOffMs only, minimumOnMs=0 for current configs. This proves the model while retaining exact behavior.
C. Only after parity tests are green, extend generated runtime config/runtime with compact fields and keep relayArbiter as the sole Switch.Set owner.
D. Pulse/cooldown/debounce/time-window/composition follow as separate vertical slices on top of that stable action-request boundary.
TXT
git status --short