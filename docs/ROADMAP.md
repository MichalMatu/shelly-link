# Roadmap

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**.

Device-management work is not a goal by itself. Prioritize it when it enables a concrete climate/grow use case, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

The product should remain local-first: the phone configures, manages and diagnoses; the Shelly Plug executes automation locally after installation.

## Completed structural foundation

### Unified physical Plug registry

One canonical durable Plug record is keyed by normalized `Shelly.GetDeviceInfo.id`. BLE and verified Wi-Fi/HTTP addresses are independent transport locators on that record, and transport discovery enriches the record instead of creating another saved device.

## Now — feature-complete v1 track

Develop the following slices in sequence rather than in parallel.

### 1. Runtime control/state arbitration

Freeze the control semantics before expanding History or rules so every later feature records and respects the same states.

Target model:

```text
SAFETY / FAULT
    > PAUSED
        > MANUAL
            > AUTO
```

Define one owner for the final relay decision and stable state/reason codes. At minimum cover:

- automation-requested state versus final relay state;
- explicit `AUTO`, `MANUAL`, `PAUSED` and `FAULT` control sources;
- reason code for every output transition;
- last-transition timestamp;
- explicit return-to-AUTO semantics;
- physical-button manual takeover.

Physical-button takeover contract:

- while in `AUTO`, the first physical button press always enters safe `MANUAL_OFF`;
- if relay was ON it is forced OFF; if already OFF only the mode changes;
- subsequent physical presses toggle `MANUAL_OFF <-> MANUAL_ON`;
- manual takeover never silently returns to AUTO;
- normal automation stops driving the relay immediately after takeover;
- future safety/fault logic remains higher priority than manual mode.

Minimum regression coverage:

- `AUTO + relay ON -> physical button -> MANUAL_OFF`;
- `AUTO + relay OFF -> physical button -> MANUAL_OFF`;
- subsequent `MANUAL_OFF -> MANUAL_ON -> MANUAL_OFF` toggles;
- automation cannot reassert relay state while manual takeover is active;
- safety/fault OFF overrides manual ON.

### 2. History / Datalogger

Resume from `work/kvs-datalogger`, but treat that branch as parked source material rather than something to merge mechanically. Reconcile it with the current exclusive Shelly Scripts ownership/lifecycle first.

Because the control model is frozen first, History should use the stable state/reason vocabulary from day one.

Record useful operational history, not only raw measurements. At minimum consider:

- timestamp;
- temperature;
- humidity;
- VPD;
- relay state;
- power/current where available;
- control/automation mode;
- trigger/reason code;
- physical-button takeover;
- safety/fault state;
- relevant threshold or rule context.

The goal is that History can explain **why** the relay changed state, not merely that it changed. Climate safety must remain independent of History failure.

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

Safety must win over all normal automation and manual decisions. A rule that still evaluates true, or a manual `ON`, must not immediately re-enable a relay that safety has shut down.

### 4. Rule/action model expansion

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

All requested actions pass through the already-defined control/safety arbiter before reaching the relay.

### 5. Dashboard master control

Add a clear product-level automation master state, preferably modeled as **RUNNING / PAUSED** rather than ambiguous relay ON/OFF.

Expected semantics:

- `PAUSED` stops normal automation and leaves the relay in a safe OFF state;
- datalogging and diagnostics continue;
- safety supervision remains active;
- `RUNNING` resumes evaluation while respecting minimum-OFF/cooldown constraints;
- manual relay control and physical-button takeover remain visibly distinct from the automation master state.

### 6. UX redesign round 2

Run the next major UX pass only after History, safety, rule/action and control semantics are stable.

Primary goal: make the app status-first and easier to understand rather than exposing implementation details by default.

The main dashboard should emphasize:

- whether automation is RUNNING, PAUSED, MANUAL or faulted;
- current climate values;
- current relay/output state and power;
- concise rule reason / why the output is ON or OFF;
- whether control came from automation, physical/manual takeover or safety;
- safety summary;
- clear entry to History.

Keep BLE, firmware, raw script/runtime details and transport diagnostics available, but deeper under Device / Info / Advanced rather than competing with the main product status.

### 7. Runtime watchdog, stabilization and feature freeze

Before declaring v1 feature-complete, harden the finished runtime rather than adding another feature wave.

Add or verify:

- runtime/engine health watchdog with safe-OFF failure behavior;
- last successful rule evaluation / sensor-processing heartbeat where practical;
- relay state consistency with the arbiter's requested state;
- boot/restart reason and restart counter in diagnostics/history where available;
- recovery after reboot/power cycle;
- Wi-Fi/BLE loss and reconnection behavior;
- automation/manual/pause/safety interaction matrix;
- long soak tests;
- script/runtime memory headroom;
- final hardware matrix and known final relay state;
- final UX acceptance.

After this stabilization round, declare a **v1 feature freeze**. New capabilities then require an explicit post-v1 decision rather than silently expanding the runtime.

## Runtime/script development opportunities

Use remaining Shelly runtime headroom for capabilities that materially improve reliability or explainability before adding broad new product surface.

High-value items already incorporated into the v1 track include:

- reason code for every output transition;
- last-transition timestamp;
- explicit control-source state: automation / paused / manual / safety;
- max continuous ON supervision;
- minimum ON/OFF timing;
- cooldown and debounce state;
- startup/restart guard;
- latched safety faults;
- runtime watchdog/heartbeat;
- boot/restart diagnostics;
- per-sensor disagreement diagnostics;
- optional outlier detection/rejection for multi-sensor Climate.

For multiple thermometers, diagnostics may flag an outlier relative to the sensor set before any future automatic rejection policy is enabled. Do not silently discard a sensor without an explicit and tested policy.

## v1 completion target

Treat the product as broadly **feature-complete v1** once the following are stable and hardware-accepted:

- Climate temperature / humidity / VPD automation;
- 1–4 BLE thermometers with aggregation and diagnostics;
- unified physical Plug identity/transport persistence;
- frozen AUTO/MANUAL/PAUSED/FAULT control semantics;
- deterministic physical-button takeover into safe `MANUAL_OFF`;
- History / Datalogger with reasons and fault context;
- power/current/device-temperature/max-runtime safety supervision;
- Time windows / schedules combined with rules where appropriate;
- Pulse ON/OFF actions;
- minimum ON/OFF and cooldown/debounce behavior;
- RUNNING / PAUSED master control;
- local Wi-Fi/BLE provisioning and firmware maintenance;
- final UX simplification/redesign pass;
- watchdog/reboot/recovery/soak stabilization.

After this point, new features should clear a higher bar: they should materially improve climate/grow use cases rather than merely increase application breadth.

## Post-freeze — second device type

### Shelly Plug Gen4 compatibility port

Add the Shelly Plug Gen4 only **after v1 feature freeze**, using the frozen product/runtime contract as the compatibility target.

Do not fork the application into Gen3/Gen4-specific product flows. Prefer capability/profile-driven support:

```text
physical Plug
  -> canonical identity
  -> capability profile
  -> available transport(s)
  -> frozen Shelly Link runtime/product contract
```

The Gen4 compatibility profile should describe support for capabilities such as relay, power/current measurement, device temperature, Scripts, KVS, schedules, BLE, Wi-Fi provisioning and firmware maintenance. Unsupported capabilities remain explicit rather than creating scattered `if gen === 4` behavior.

Use the same contract/regression suite wherever behavior is shared. Treat Gen4 as an architectural proof that the reusable Shelly platform can support a second physical device without duplicating product logic.

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
