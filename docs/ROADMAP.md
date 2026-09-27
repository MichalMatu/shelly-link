# Roadmap

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**.

Device-management work is not a goal by itself. Prioritize it when it enables a concrete climate/grow use case, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

The product should remain local-first: the phone configures, manages and diagnoses; the Shelly Plug executes automation locally after installation.

## Now — structural cleanup before the next feature wave

### Unified physical Plug registry

Create one canonical durable record per normalized `Shelly.GetDeviceInfo.id` with independent transport metadata such as BLE locator and verified Wi-Fi/HTTP locator.

The current Wi-Fi and BLE registries can represent the same physical Plug twice. Dashboard-level dedupe is not a sufficient long-term model. Do not solve this with more cross-registry guards; converge ownership around one physical-device record.

This is a bounded architecture cleanup, not a UX redesign.

## Next — feature-complete v1 track

After the unified Plug registry, develop the following slices in sequence rather than in parallel.

### 1. History / Datalogger

Resume from `work/kvs-datalogger`, but treat that branch as parked source material rather than something to merge mechanically. Reconcile it with the current exclusive Shelly Scripts ownership/lifecycle first.

The logger should record useful operational history, not only raw measurements. At minimum consider:

- timestamp;
- temperature;
- humidity;
- VPD;
- relay state;
- power/current where available;
- automation mode;
- trigger/reason code;
- safety/fault state;
- relevant threshold or rule context.

The goal is that history can explain **why** the relay changed state, not merely that it changed.

Climate safety must remain independent of History failure.

### 2. Rule/action model expansion

Extend the stable runtime toward a small reusable **rule + action engine**, rather than adding more feature-specific automation types.

Priority capabilities:

- Pulse ON for a configured duration;
- Pulse OFF for a configured duration;
- Pulse actions restore the state implied by the automation after the pulse rather than blindly toggling;
- minimum ON duration;
- minimum OFF duration;
- cooldown;
- debounce / condition-must-remain-true delay;
- time windows combined with sensor rules;
- scheduled triggers combined with conditions;
- simple reusable `AND` / `OR` composition where the safety model stays explicit.

Model pulse as an **action**, not as a special standalone rule. Example actions may include `Set ON`, `Set OFF`, `Pulse ON`, `Pulse OFF`.

### 3. Runtime safety supervisor

Safety is a separate layer above normal automation and manual behavior, not an ordinary user rule.

Target protections:

- maximum power;
- maximum current;
- maximum Plug/device temperature;
- maximum continuous ON duration;
- startup delay after reboot when appropriate;
- latched safety fault/lockout;
- explicit fault/reason code;
- deliberate acknowledge/reset path before automation may resume after a latched fault.

Safety must win over all normal automation decisions. A rule that still evaluates true must not immediately re-enable a relay that safety has shut down.

### 4. Dashboard master control

Add a clear product-level automation master state, preferably modeled as **RUNNING / PAUSED** rather than ambiguous relay ON/OFF.

Expected semantics:

- `PAUSED` stops normal automation and leaves the relay in a safe OFF state;
- datalogging and diagnostics continue;
- safety supervision remains active;
- `RUNNING` resumes evaluation while respecting minimum-OFF/cooldown constraints;
- manual relay control, if exposed, remains visibly distinct from the automation master state.

### 5. UX redesign round 2

Run the next major UX pass only after the datalogger, rule/action model and safety semantics are stable.

Primary goal: make the app more status-first and easier to understand rather than exposing implementation details by default.

The main dashboard should emphasize:

- whether automation is RUNNING or PAUSED;
- current climate values;
- current relay/output state and power;
- concise rule reason / why the output is ON or OFF;
- safety summary;
- clear entry to History.

Keep BLE, firmware, raw script/runtime details and transport diagnostics available, but deeper under Device / Info / Advanced rather than competing with the main product status.

## Runtime/script development opportunities

Use remaining Shelly runtime headroom for capabilities that materially improve reliability or explainability before adding broad new product surface.

High-value candidates:

- reason code for every output transition;
- last-transition timestamp;
- max continuous ON supervision;
- minimum ON/OFF timing;
- cooldown and debounce state;
- startup/restart guard;
- latched safety faults;
- per-sensor disagreement diagnostics;
- optional outlier detection/rejection for multi-sensor Climate;
- clear distinction between sensor fault, rule decision, manual state and safety override.

For multiple thermometers, diagnostics may flag an outlier relative to the sensor set before any future automatic rejection policy is enabled. Do not silently discard a sensor without an explicit and tested policy.

## v1 completion target

Treat the product as broadly **feature-complete v1** once the following are stable and hardware-accepted:

- Climate temperature / humidity / VPD automation;
- 1–4 BLE thermometers with aggregation and diagnostics;
- Time windows / schedules combined with rules where appropriate;
- Pulse ON/OFF actions;
- minimum ON/OFF and cooldown/debounce behavior;
- History / Datalogger with reasons and fault context;
- power/current/device-temperature/max-runtime safety supervision;
- RUNNING / PAUSED master control;
- local Wi-Fi/BLE provisioning and firmware maintenance;
- final UX simplification/redesign pass.

After this point, new features should clear a higher bar: they should materially improve climate/grow use cases rather than merely increase application breadth.

## Later — explicit product bets, not automatic next work

Potential later extensions:

- alarm/notification delivery for meaningful fault and safety events;
- richer sensor-failure / outlier handling;
- broader condition composition beyond the initial simple `AND` / `OR` model;
- persistent BLE pairing/bonding on firmware 2.x when a real product use case requires it;
- offline firmware update only through a documented/safe path with real-hardware proof;
- curated script library only if it fits the climate/grow product direction and current script-ownership model;
- broader Shelly device support only when tied to a concrete climate/grow scenario.

The deferred zero-friction onboarding orchestrator is not an automatic next task. Reconsider it later only if real setup friction justifies another user-facing flow.

## Parked

`work/kvs-datalogger` remains intentional source material until the History slice begins. Do not mechanically rebase/merge it.

BLE soil-moisture and broad general-purpose Shelly management remain deferred until the core climate/grow v1 path is complete.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` whenever responsive E2E is part of the acceptance surface. Hardware-facing behavior requires real-device acceptance and an explicit final relay state when a relay mutation is exercised.

Keep active work on one clearly named branch, merge completed slices promptly, and delete retired work branches after the merged `main` is re-verified. Preserve intentionally parked branches from separate tracks instead of deleting them as incidental cleanup.
