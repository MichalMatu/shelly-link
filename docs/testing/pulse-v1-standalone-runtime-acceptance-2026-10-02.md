# Pulse V1 Standalone runtime acceptance — 2026-10-02

## Scope

This record qualifies the **Standalone Pulse adapter/runtime** slice only. It does not qualify the later shared Pulse setup/editor UI or dashboard/detail phase/progress presentation.

Standalone Pulse has no Climate or Time parent. It is implemented as a thin adapter around the existing shared Pulse-cycle engine and remains one managed owner of the selected relay.

## Qualified code

- branch: `pulse-v1-standalone-adapter`
- hardware-tested runtime/code candidate: `bcfb01f5c6e76bcf571ed013bc650f4d847861e6`
- final code-only qualification candidate before durable closeout: `452b69d957dcc0f4d4efb5c777a5c186bfdbc247`
- descendants after the hardware-tested runtime only add app ownership/reconciliation integration, repository-boundary cleanup, tests and durable documentation; they do not change the generated Standalone Shelly runtime behavior.

`main` remained untouched.

## Architecture accepted

The slice reuses the exact existing `renderPulseCycleExecution()` implementation. No second Pulse engine or forked timer state machine was introduced.

The Standalone adapter adds only the parentless responsibilities around that engine:

- bounded `{ relayId, pulse }` configuration;
- compact generated runtime config;
- boot-time explicit `Switch.Set OFF` before starting a fresh Pulse cycle;
- lifecycle `rq(true)` / `rq(false)` control;
- relay-control fault and native switch-protection fail-OFF handling;
- durable `InstalledAutomation` ownership with `kind: "pulse"`;
- physical-device identity checks before destructive lifecycle work;
- install/pause/resume/delete safe-OFF behavior;
- existing one-owner-per-relay conflict checks;
- reconciliation by expected running script ID and generated-code hash.

The transient Pulse phase/timer state is never persisted. Restart starts from safe OFF and creates a fresh cycle rather than resuming an unknown timer.

The existing Climate and Time + Pulse runtime slices were not reopened or minified.

## Software evidence

The final code-only candidate passed:

- `@lcl/automation-core` typecheck and tests: **157/157 passed**;
- Standalone generator/runtime focused tests: **16/16 passed**, including relay-control fault safe-OFF and the explicit `>12000 B` hard-size guard;
- the full `@lcl/script-generator` suite: **229/229 passed with 100% statements / branches / functions / lines**;
- mobile typecheck;
- focused mobile persistence/lifecycle/reconciliation tests: **15/15 passed**, including the existing Time + Pulse reconciliation regression;
- feature-boundary quality gate after narrowing unused public re-exports without changing runtime behavior;
- full repository `pnpm check` with exit code 0 and a clean worktree on `452b69d957dcc0f4d4efb5c777a5c186bfdbc247`.

The generated runtime tests cover:

- bounded validation;
- config source round-trip;
- Continuous, Cycles and Duration encoding;
- initial delay;
- ON and OFF start phases;
- exact reuse of the shared Pulse engine;
- boot safe OFF and fresh-cycle start;
- Cycles safe-OFF completion;
- Duration truncation and safe-OFF completion;
- lifecycle cancellation;
- relay-control failure latching and forced OFF;
- native switch-protection errors and boot-time protection errors;
- enforcement of the accepted 12000 B hard generated-size ceiling.

Representative generated sizes are far below the accepted 12000 B hard ceiling:

- Continuous: **1783 B**;
- Cycles: **1789 B**;
- Duration: **1803 B**.

No safety/recovery behavior was removed to reach these sizes.

## Real Plug S Gen3 acceptance

Device:

- canonical id: `shellyplugsg3-e4b063d7f530`;
- model: `S3PL-00112EU`;
- firmware: `1.7.5`.

Production preflight before the successful acceptance run confirmed:

- one production script, `id=1`, `Shelly Link Thermostat`;
- production source SHA-256 `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`;
- production runtime running;
- MANUAL mode, manual request OFF, no automation fault, no hard-safety lockout;
- physical relay OFF;
- no native Schedule jobs.

The isolated temporary Standalone Pulse fixture used:

- relay `0`;
- ON `1000 ms`;
- OFF `1000 ms`;
- initial delay `5000 ms`;
- start phase `ON`;
- fixed `2` cycles.

Observed hardware behavior:

1. production script was stopped and relay was explicitly forced/verified OFF;
2. temporary Standalone script started in Pulse delay state with relay physically OFF;
3. relay remained OFF during the observed initial-delay interval;
4. two physical ON/OFF cycles occurred;
5. fixed-cycle completion settled physically OFF with runtime phase complete;
6. another explicit OFF verification passed;
7. script restart again began in a fresh initial-delay state with relay OFF and cycle count reset;
8. `rq(false)` cancelled that fresh cycle immediately and relay remained OFF beyond the original delay boundary;
9. smoke completion, cleanup and final restoration each performed an explicit physical OFF verification;
10. the temporary script was deleted;
11. production source SHA remained byte-identical;
12. production script was running again, no schedules existed, MANUAL/OFF state was restored and relay was physically OFF.

The earlier acceptance attempts were intentionally retained as diagnostic evidence:

- one fixture was rejected by bounded validation before hardware mutation because `700 ms` was below the accepted `1000 ms` minimum phase duration;
- one test assertion incorrectly treated a completed one-shot timer handle as evidence of an active timer even though the cycle had completed physically OFF;
- one `500 ms` initial-delay observation sampled too late because the `Script.Start` RPC returned after that short delay had elapsed;
- restarting production briefly produced the normal Climate `st` stale-sensor fault, still MANUAL/OFF. A subsequent non-mutating 30 s observation confirmed fresh BLE data cleared it and production remained stable OFF.

Those observations did not require a Standalone runtime code change.

## Qualification result

**Standalone Pulse adapter/runtime is qualified.**

Do not reopen or minify this runtime without a concrete failing test, real hardware issue or generated-size regression.

The next Pulse V1 slice is the shared Pulse setup/editor UI reused by Climate, Time and standalone Pulse, followed by responsive/visual acceptance and then Pulse phase/progress/status integration into the existing requested/final output, reason, automation-fault and hard-safety presentation.
