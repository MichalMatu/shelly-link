# Roadmap

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**. Device-management work is valuable when it enables climate/grow use cases, improves safety/reliability, reduces setup friction or adds useful operational diagnostics.

The product stays local-first: the phone configures/manages/diagnoses; Shelly executes installed automation locally.

## Completed foundation

### Unified physical Plug registry — completed 2026-09-27

One durable Plug record is keyed by normalized `Shelly.GetDeviceInfo.id`. BLE and verified HTTP addresses are transport locators on that record. Hardware setup owns workflow state, not another device registry. Legacy development-state records migrate by canonical identity.

### Runtime control/state arbitration — completed 2026-09-27

Climate control now uses the frozen priority model:

```text
FAULT / safety
    > PAUSED
        > MANUAL
            > AUTO
```

The runtime owns the final relay decision. It tracks automation-requested state separately from final relay state and exposes control mode, reason and last relay-change uptime in diagnostics. Manual mode starts safe OFF, manual ON/OFF is explicit, PAUSED is safe OFF, FAULT cannot silently resume, and return to AUTO is explicit. Runtime upgrades preserve the automation-requested state.

For Plug S Gen3, managed Climate ownership keeps the physical button `detached` and restores the prior mode on uninstall. Firmware 1.7.5 exposes no usable local Input/Button event for the built-in button while detached, so **physical takeover is not a Plug S Gen3 capability**. Manual takeover is app-driven. Future hardware may support physical takeover only through an explicitly verified input/button capability.

## Now — feature-complete v1 track

Develop these slices in order rather than in parallel.

### 1. History / Datalogger

Resume from `work/kvs-datalogger` as source material, not a mechanical merge. Reconcile it with current exclusive Climate script ownership first.

History should explain **why** output changed. Record useful operational context such as timestamp, climate values, VPD, automation-requested and final relay state, control mode, reason code, safety/fault context and power/current where available. History failure must not affect Climate safety.

### 2. Runtime safety supervisor

Add explicit protection above normal automation/manual behavior: maximum power/current/device temperature, maximum continuous ON, startup guard where useful, latched fault/lockout and deliberate acknowledge/reset. Safety always wins and forces OFF.

### 3. Rule/action expansion

Extend the stable runtime with reusable actions and timing: Set ON/OFF, Pulse ON/OFF, minimum ON/OFF, cooldown, debounce, time windows, scheduled conditions and small explicit AND/OR composition. Every requested action passes through the control/safety arbiter.

### 4. Dashboard master control

Expose clear product-level RUNNING / PAUSED semantics. PAUSED is safe OFF while diagnostics, History and safety continue. Manual control remains a separate visible state.

### 5. UX redesign round 2

After History/safety/rules stabilize, make the dashboard status-first: current climate, final output, requested output, control mode/reason, safety summary and History. Keep transport/script/firmware diagnostics deeper under Device / Info / Advanced.

### 6. Watchdog, stabilization and v1 feature freeze

Verify runtime heartbeat/watchdog, reboot and power-cycle recovery, Wi-Fi/BLE loss, control-mode interaction matrix, long soak, script memory headroom, final hardware matrix and final UX acceptance. Then declare **v1 feature freeze**.

## v1 completion target

Feature-complete v1 requires:

- Climate temperature / humidity / VPD automation with 1–4 BLE thermometers;
- canonical physical Plug persistence and transport promotion;
- frozen AUTO/MANUAL/PAUSED/FAULT arbitration;
- capability-correct manual control (app-driven on Plug S Gen3; physical input only where hardware exposes it);
- History / Datalogger with reason and fault context;
- runtime safety supervisor;
- pulse/timing/rule composition;
- RUNNING / PAUSED master control;
- final UX simplification;
- watchdog/recovery/soak stabilization.

## Post-freeze

Shelly Plug Gen4 is the intended second physical Plug type after v1 freeze. Treat it as a capability/profile-driven compatibility port against the frozen product/runtime contract, not a reason to fork product flows.

Notifications, richer outlier handling, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain explicit later decisions.

## Parked

`work/kvs-datalogger` remains intentional source material until the History slice begins. Do not mechanically rebase/merge it.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` when responsive E2E is part of the acceptance surface. Hardware-facing work requires real-device evidence and an explicit final relay state when relay mutation is exercised.
