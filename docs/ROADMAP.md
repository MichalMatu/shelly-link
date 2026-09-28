# Roadmap

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**. Device-management work is valuable when it enables climate/grow use cases, improves safety/reliability, reduces setup friction or adds useful operational diagnostics.

The product stays local-first: the phone configures/manages/diagnoses; Shelly executes installed automation locally.

## Completed foundation

### Unified physical Plug registry — completed 2026-09-27

One durable Plug record is keyed by normalized `Shelly.GetDeviceInfo.id`. BLE and verified HTTP addresses are transport locators on that record. Hardware setup owns workflow state, not another device registry. Legacy development-state records migrate by canonical identity.

### Runtime control/state arbitration — completed 2026-09-27

Climate runtime user control is intentionally small:

```text
AUTO | MANUAL
```

Control mode is separate from automation health and hard safety. The runtime owns the final relay decision and tracks automation-requested state, manual request, automation fault and hard safety lockout independently.

Entering MANUAL starts safe OFF and explicit ON/OFF is allowed only in MANUAL. Automation sensor/runtime faults force AUTO safe OFF but do not revoke explicit MANUAL control. Hard safety lockout remains higher priority than both modes and forces OFF until deliberate recovery. Returning to AUTO is explicit, starts safe OFF and waits for fresh usable automation data before energizing again.

Diagnostics expose control mode, manual request, automation-requested relay state, automation fault, safety lockout, final relay state, reason, last relay-change uptime and last control-mode transition uptime. Mobile control uses `Script.Eval`; it does not bypass the runtime with raw `Switch.Set`.

For Plug S Gen3, managed Climate ownership keeps the physical button `detached` and restores the prior mode on uninstall. Firmware 1.7.5 exposes no usable local Input/Button event for the built-in button while detached, so **physical takeover is not a Plug S Gen3 capability**. Manual takeover is app-driven. Future hardware may support physical takeover only through an explicitly verified input/button capability.

### Plug surface stabilization — completed 2026-09-28

BLE-only Plug cards now keep confirmed offline state visible across background polling instead of changing geometry on every retry. Relay controls remain disabled until a successful runtime read restores reachability.

Plug Detail now starts directly with the five-tab surface; the intermediate identity summary card was removed and identity/model/transport detail remains owned by **Info**. This did not change managed Button Mode ownership: Climate still keeps Plug S Gen3 `detached` while it owns the relay.

Plain saved Plugs remain directly navigable after automation removal. Their Detail opens on an active **Automation** empty state with a Plug-scoped **Add automation** CTA, while Device/BLE/Info remain available.

Redundant top-level `← Plugs` controls were removed from automation intent, Time detail and top-level not-found states; page-local Back remains only for true nested subflows that return to a specific parent context.

## Now — feature-complete v1 track

Develop these slices in order rather than in parallel.

### 1. History / Datalogger

Resume from `work/kvs-datalogger` as source material, not a mechanical merge. Reconcile it with current exclusive Climate script ownership first.

History should explain **why** output changed. Record useful operational context such as timestamp, climate values, VPD, automation-requested and final relay state, control mode, manual request, reason code, automation-fault context, hard-safety context and power/current where available. History failure must not affect Climate safety.

### 2. Runtime safety supervisor

Expand the explicit hard-safety layer above AUTO/MANUAL behavior: maximum power/current/device temperature, maximum continuous ON, startup guard where useful, latched lockout and deliberate acknowledge/reset. Hard safety always wins and forces OFF.

### 3. Rule/action expansion

Extend the stable runtime with reusable actions and timing: Set ON/OFF, Pulse ON/OFF, minimum ON/OFF, cooldown, debounce, time windows, scheduled conditions and small explicit AND/OR composition. Every requested action passes through the same final relay arbiter.

### 4. Dashboard control/status polish

Present the two Climate control modes clearly without introducing another user mode. Keep AUTO/MANUAL, requested output, final output, automation-fault state and hard-safety state understandable at a glance.

### 5. UX redesign round 2

After History/safety/rules stabilize, make the dashboard status-first: current climate, final output, requested output, control mode/reason, safety summary and History. Keep transport/script/firmware diagnostics deeper under Device / Info / Advanced.

### 6. Watchdog, stabilization and v1 feature freeze

Verify runtime heartbeat/watchdog, reboot and power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL interaction matrix, automation-fault recovery, hard-safety recovery, long soak, script memory headroom, final hardware matrix and final UX acceptance. Then declare **v1 feature freeze**.

## v1 completion target

Feature-complete v1 requires:

- Climate temperature / humidity / VPD automation with 1–4 BLE thermometers;
- canonical physical Plug persistence and transport promotion;
- frozen AUTO/MANUAL user control with separate automation-fault and hard-safety axes;
- capability-correct manual control (app-driven on Plug S Gen3; physical input only where hardware exposes it);
- History / Datalogger with reason, fault and safety context;
- runtime safety supervisor;
- pulse/timing/rule composition;
- clear dashboard control/status presentation without a third Climate mode;
- watchdog/recovery/soak stabilization.

## Post-freeze

Shelly Plug Gen4 is the intended second physical Plug type after v1 freeze. Treat it as a capability/profile-driven compatibility port against the frozen product/runtime contract, not a reason to fork product flows.

Notifications, richer outlier handling, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain explicit later decisions; they are not prerequisites for v1.

## Parked

`work/kvs-datalogger` remains intentional source material until the History slice begins. Do not mechanically rebase/merge it.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` when responsive E2E is part of the acceptance surface. Hardware-facing work requires real-device evidence and an explicit final relay state when relay mutation is exercised.
