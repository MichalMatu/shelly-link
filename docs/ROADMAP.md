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

The current UI intentionally presents this data as a simple chronological record list. Rich chart visualization is a separate product/UI slice described below; it should reuse the existing data path first.

### 2. Runtime Safety Supervisor — completed 2026-09-30

Maximum continuous ON, relay-control failures and native Shelly protection errors converge on one first-fault-wins hard-safety latch. Reset remains safe OFF. Plug-owned firmware limits remain the authority for device electrical/thermal ceilings.

### 3. Rule/action expansion — foundations merged, advanced scope parked

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

Advanced candidates that are **not the immediate next slice**:

- Pulse integration in the Shelly Climate runtime;
- time-window/scheduled-condition execution in the Climate runtime;
- AND/OR condition execution in the Climate runtime;
- configuration/editor surfaces for whichever of those capabilities are later accepted for v1.

**Constraint:** the stabilization baseline is 9431 B / 9500 B for the canonical four-sensor minimum-ON + debounce fixture. Sensor display names are capped at 26 escaped UTF-8 runtime bytes; the full four-sensor, minimum-ON + debounce + VPD matrix peaks at 9496 B / 9500 B. Before adding more runtime behavior, re-audit code size, ownership and reuse opportunities. Do not raise the generator limit as a shortcut.

Do not resume this advanced Rule/action work during the pre-charts closeout unless the user explicitly reprioritizes it.

### 4. Pre-charts closeout — next

Before another product feature, make the repository baseline intentionally boring:

- remove stale/superseded documentation and keep the active doc set small;
- remove merged/stale working branches while preserving `agent-control` and the intentional `golden/climate-ui-20260928` reference branch;
- perform a fresh ownership/layering/dead-code/error-retry/test-gap audit from current `main`;
- fix only small, clear quality findings rather than starting a broad refactor;
- merge retained cleanup through small PRs;
- finish with no open PRs, no temporary work branches and one final canonical gate.

The exact closeout procedure and known audit targets are in `docs/HANDOFF_NEXT_CHAT.md`.

### 5. History visualization / charts — next user-facing slice after closeout

Build a real History visualization page on top of the existing Shelly History/Datalogger and typed `HistoryRecord[]` mobile data path.

Initial design/architecture should decide:

- which chart series are first-class: temperature, humidity, VPD, relay state, power/current;
- timestamp vs uptime-only records and the time-axis contract;
- readable representation of AUTO/MANUAL, reason/fault/safety transitions;
- whether the detailed chronological list remains as a lower/fallback section;
- mobile interaction, accessibility, partial/corrupt-history and empty states;
- whether a production chart dependency is justified. New production dependencies require explicit approval.

Prefer presentation work first. Do not redesign runtime persistence solely to support charts unless the existing data format proves insufficient.

This is an intentional visual-contract change and requires reviewed responsive/real-device evidence.

### 6. Dashboard status polish

After the closeout/chart slice is stable, improve the operational status layer without casually changing shared card geometry: requested output, final output, reason, automation-fault state and hard-safety state should be understandable at a glance.

### 7. UX redesign round 2

After History/safety/rules stabilize, make the dashboard more status-first while keeping transport/script/firmware diagnostics deeper under Device / Info / Advanced.

### 8. Watchdog, stabilization and v1 feature freeze

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

History charts are a high-priority usability slice but should reuse the completed History runtime/data foundation rather than becoming a second history subsystem.

## Post-freeze

Shelly Plug Gen4 is the intended second physical Plug type after v1 freeze. Treat it as a capability/profile-driven compatibility port against the frozen product/runtime contract, not a reason to fork product flows.

Notifications, richer outlier handling, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain later decisions.

## Preserved reference

`golden/climate-ui-20260928` is the intentional frozen recovery/reference branch for the accepted Climate UI. It is not a working branch and should remain until the golden visual contract no longer depends on it.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` when responsive E2E is part of the acceptance surface. Hardware-facing work requires real-device evidence and an explicit final relay state when relay mutation is exercised.
