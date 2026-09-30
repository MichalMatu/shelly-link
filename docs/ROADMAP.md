# Roadmap

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**. The phone configures, manages and diagnoses; Shelly executes installed automation locally.

Device-management work is valuable when it enables climate/grow use cases, improves safety/reliability, reduces setup friction or adds useful operational diagnostics.

## Stable foundation

The following are established product/runtime contracts, not active project slices:

- one canonical physical Plug record keyed by normalized `Shelly.GetDeviceInfo.id`, with BLE/HTTP as locators;
- one managed automation owner per Plug relay;
- Climate control modes are AUTO/MANUAL only, with separate automation-fault and hard-safety axes;
- hard safety always forces OFF and requires deliberate recovery;
- Plug S Gen3 manual takeover is app-driven while managed input mode is detached;
- capability-driven Plug Detail and the shared/frozen Climate visual language;
- History/Datalogger in the existing Climate runtime via a namespaced KVS ring, typed mobile read path and History detail surface;
- native Shelly power/current/thermal protections feed the latched Runtime Safety Supervisor rather than being duplicated as guessed app thresholds.

See `docs/ARCHITECTURE.md` for durable ownership/safety contracts and `docs/testing/hardware-matrix.md` for real-device evidence.

## V1 track

### 1. History / Datalogger — completed 2026-09-30

History records enough operational context to explain output changes: climate/VPD, requested/final relay, mode/manual request, reason, automation fault, hard safety and power/current where available. History failures are isolated from relay arbitration.

### 2. Runtime Safety Supervisor — completed 2026-09-30

Maximum continuous ON, relay-control failures and native Shelly protection errors converge on one first-fault-wins hard-safety latch. Reset remains safe OFF. Plug-owned firmware limits remain the authority for device electrical/thermal ceilings.

### 3. Rule/action expansion — in progress

Merged foundations/runtime work:

- typed Set action + minimum ON/OFF timing model;
- existing minimum-OFF path remains the cooldown owner;
- pure Pulse action semantics;
- pure relay debounce model;
- reusable daily time-window condition;
- flat explicit AND/OR condition composition;
- Climate runtime minimum-ON integration;
- Climate runtime relay-debounce integration with one-shot maturity and forced-OFF precedence;
- runtime source compaction without raising the 9500 B guard.

Still pending before this slice is complete:

- Pulse integration in the Shelly Climate runtime;
- time-window/scheduled-condition execution in the Climate runtime;
- AND/OR condition execution in the Climate runtime;
- configuration/editor surface for whichever of those capabilities are accepted for v1.

**Constraint:** the accepted maximum four-sensor runtime with minimum ON + debounce is 9413 B / 9500 B. Before adding more runtime behavior, re-audit code size, ownership and reuse opportunities. Do not raise the generator limit as a shortcut.

The immediate next work session is a stabilization/re-audit pass, not automatic implementation of the next pending primitive. See `docs/HANDOFF_NEXT_CHAT.md`.

### 4. Dashboard status polish

After the rule/action baseline is stable, improve the operational status layer without changing shared card geometry: requested output, final output, reason, automation-fault state and hard-safety state should be understandable at a glance.

### 5. UX redesign round 2

After History/safety/rules stabilize, make the dashboard more status-first while keeping transport/script/firmware diagnostics deeper under Device / Info / Advanced.

### 6. Watchdog, stabilization and v1 feature freeze

Verify heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL interaction matrix, automation-fault and hard-safety recovery, long soak, script-memory headroom, final hardware matrix and final UX acceptance. Then declare v1 feature freeze.

## V1 completion target

Feature-complete v1 requires:

- Climate temperature / humidity / VPD automation with 1–4 BLE thermometers;
- canonical Plug persistence and transport promotion;
- AUTO/MANUAL with separate automation-fault and hard-safety axes;
- capability-correct manual control;
- History / Datalogger with reason/fault/safety context;
- Runtime Safety Supervisor;
- accepted pulse/timing/rule-composition scope;
- clear dashboard control/status presentation;
- watchdog/recovery/soak stabilization.

## Post-freeze

Shelly Plug Gen4 is the intended second physical Plug type after v1 freeze. Treat it as a capability/profile-driven compatibility port against the frozen product/runtime contract, not a reason to fork product flows.

Notifications, richer outlier handling, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain later decisions.

## Preserved reference

`golden/climate-ui-20260928` is the intentional frozen recovery/reference branch for the accepted Climate UI. It is not a working branch and should remain until the golden visual contract no longer depends on it.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` when responsive E2E is part of the acceptance surface. Hardware-facing work requires real-device evidence and an explicit final relay state when relay mutation is exercised.
