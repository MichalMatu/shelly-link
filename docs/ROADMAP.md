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

The mobile UI presents the same typed records through the completed History visualization described below; it does not create a second persistence/runtime path.

### 2. Runtime Safety Supervisor — completed 2026-09-30

Maximum continuous ON, relay-control failures and native Shelly protection errors converge on one first-fault-wins hard-safety latch. Reset remains safe OFF. Plug-owned firmware limits remain the authority for device electrical/thermal ceilings.

### 3. Rule/action expansion — foundations merged; Pulse promoted to V1

Merged foundations/runtime work:

- typed Set action + minimum ON/OFF timing model;
- existing minimum-OFF path remains the cooldown owner;
- pure one-shot Pulse action semantics;
- pure relay debounce model;
- reusable daily time-window condition;
- flat explicit AND/OR condition composition;
- Climate runtime minimum-ON integration;
- Climate runtime relay-debounce integration with one-shot maturity and forced-OFF precedence;
- runtime source compaction without raising the 9500 B guard.

The pure `RelayPulseAction` / one-shot state machine remains supported. Pulse V1 additionally has a bounded shared cycle model for ON/OFF phases, initial delay, Continuous/Cycles/Duration execution and safe-OFF completion. Climate configuration can carry optional `execution.pulse` and/or `execution.activeWindow`; when `execution` is absent, the existing steady Climate config shape remains unchanged. These are configuration/domain foundations until generated-runtime integration is completed. Pulse V1 is defined in section 6.

Advanced rule candidates that remain parked and do **not** block Pulse V1:

- general time-window/scheduled-condition execution inside the Climate rule engine beyond the accepted Time automation + Pulse composition;
- general AND/OR condition execution in the Climate runtime;
- configuration/editor surfaces for those general condition-composition capabilities if they are later accepted.

**Runtime-size policy:** the stabilization baseline is 9431 B / 9500 B for the canonical four-sensor minimum-ON + debounce fixture. Sensor display names are capped at 26 escaped UTF-8 runtime bytes; the full four-sensor, minimum-ON + debounce + VPD matrix peaks at 9496 B / 9500 B. Keep 9500 B as the preferred target while Pulse and active-window execution are integrated, and emit new runtime logic only for configurations that use it. If the final supported Pulse + active-window worst case genuinely exceeds 9500 B, the guard may be raised once to **10000 B** after focused generator coverage and real-Plug validation. Do not remove working safety/recovery capability or perform risky refactors solely to defend the old 9500 B target.

### 4. Pre-charts closeout — completed 2026-09-30

The repository baseline was deliberately closed before chart work:

- active documentation was reduced to the current architecture, roadmap, handoff, performance, UX and hardware-test contracts;
- historical Local Agent branches/worktrees were compared against current `main`, merged PRs or accepted successor branches before retirement;
- ownership/layering, transport placement, persistence/recovery, retry behavior, typing, dead-code candidates and test coverage were re-audited from fresh `main`;
- no clear production-code cleanup justified a behavior change or broad refactor;
- `runtimeConfigUpdate` was retained because, despite having no current app call-site, it is a recent capability-gated generator contract with focused tests and is not proven dead;
- reconciliation states `changed`, `unavailable` and `conflict` remain boundary-tested, but the setup flow currently consumes recovered sensors rather than surfacing those statuses. Turning those outcomes into user-facing behavior is a product/UX decision and is intentionally parked rather than smuggled into cleanup.

Neither retained item blocks Pulse V1.

### 5. History visualization / charts — completed 2026-10-01

History is chart-first on the existing typed `HistoryRecord[]` data path. The accepted phone presentation is a vertical stack of five compact metric panels: Temperature, Humidity, Output, Power and Current. VPD stays in the typed History/runtime data model but is not shown in the accepted five-panel stack.

Each continuous metric owns a real-unit Y domain instead of sharing normalized plot coordinates with unrelated units. Minimum spans deliberately calm small fluctuations: Temperature 4 °C, Humidity 20 percentage points, Power 50 W from zero and Current 0.6 A from zero; the policy still expands when real data exceeds those spans. Continuous series use monotone smoothing with a restrained area tint, subtle glow and a latest-value point. Output remains a strict digital step track with horizontal/vertical transitions only and no filled area.

All five panels share the same truthful time domain and one compact time row below the stack. The previous legend/toggle, tooltip and crosshair interaction are removed because every metric is permanently visible with its current reading and range. Timestamp/uptime x positions preserve real elapsed spacing with record order only as the final fallback. Loading/retry/empty/partial-corruption behavior remains presentation-only over the existing History runtime/KVS model.

Focused History tests, mobile typecheck, UX quality gate and the final repository `pnpm check` passed. Samsung S22+ / Android 16 preserving-data acceptance confirmed five stacked panels, no horizontal overflow, compact phone geometry and an Output SVG path with `fill: none` and square `H/V` transitions. The canonical Darwin History snapshot was subsequently refreshed deliberately and the full responsive suite passed 36/36. No runtime, KVS, `HistoryRecord[]`, schedule or relay behavior changed.

### 6. Pulse V1 — immediate next slice

Pulse becomes a first-class automation capability with **one shared pulse-cycle engine** and two product entry points. Do not implement separate temperature-pulse, humidity-pulse or time-pulse runtimes.

#### Product model

Automation setup exposes four primary automation types:

1. Temperature;
2. Humidity;
3. Time;
4. Pulse.

Temperature, Humidity and Time additionally support an output behavior selector:

- **Steady** — current normal ON/OFF behavior;
- **Pulse** — when the parent automation requests active output, execute the shared Pulse cycle instead of holding the relay continuously ON.

Temperature and Humidity also support an optional daily **active window**. Outside that window AUTO requests safe OFF; inside it the existing climate condition decides whether output is active. Active windows may cross midnight. Time automation already owns an explicit daily ON/OFF window; Time + Pulse reuses that window rather than introducing another scheduler.

Standalone Pulse is the same engine without a climate condition. It is useful for pumps, fans, irrigation, mixers, dosing and other periodic loads.

Examples:

- Temperature + Pulse: below the ON threshold, run `ON 10 s -> OFF 20 s -> ...`; crossing the OFF threshold cancels Pulse and leaves the relay OFF.
- Humidity + Pulse: the same Pulse behavior while the humidity rule requests output.
- Time + Pulse: inside the configured active time window, run the Pulse cycle; when the time window closes, cancel the cycle immediately and leave the relay OFF.
- Standalone Pulse: run the configured cycle continuously, for a number of cycles, or for a bounded total duration.

#### Pulse V1 configuration

Pulse V1 should support:

- ON time in seconds;
- OFF time in seconds;
- execution mode:
  - Continuous;
  - fixed number of cycles;
  - bounded total duration;
- optional initial delay before the first phase;
- start phase selection (ON or OFF), with ON as the simple/default path;
- safe end state: OFF after completion/cancellation;
- one-shot Pulse as the degenerate/simple case already covered by the existing pure Pulse foundation;
- clear validation and sensible lower/upper bounds for all time/count inputs.

The UI should follow the existing optional-advanced-control pattern used by VPD: Pulse is compact while disabled and reveals its parameters only when enabled. Standalone Pulse gets a dedicated automation setup surface but reuses the same Pulse configuration component/model.

#### Runtime and safety semantics

Pulse is an output behavior, never a competing relay owner. The existing one-automation-owner-per-Plug invariant remains unchanged.

Required precedence and lifecycle:

- hard safety and every forced-OFF path remain authoritative and cancel Pulse immediately;
- automation fault that requires OFF cancels Pulse immediately;
- when the parent Temperature/Humidity/Time condition stops requesting output, Pulse is cancelled immediately and relay ends OFF rather than finishing the current cycle;
- MANUAL relay control suspends/cancels the active Pulse cycle; returning to AUTO starts a fresh cycle from the configured start phase if the parent condition is still active;
- reboot/power-cycle starts safe OFF; do not attempt to resume an unknown in-flight timer. After runtime state is rebuilt, an active parent condition may start a fresh cycle;
- Pulse must compose with existing minimum ON/OFF, debounce and cooldown ownership without introducing a second timing owner or weakening forced-OFF precedence;
- Pulse transitions must not bypass physical-device identity gates or Runtime Safety Supervisor behavior.

History and operational status must remain explanatory: Pulse-driven relay changes need distinguishable reason/phase information so a user can understand why output toggled. Dashboard/detail status should be able to show at least Pulse active phase and, where practical, remaining time / cycle progress without moving timer ownership into React.

#### Pulse V1 qualification

Before calling Pulse V1 complete:

- re-audit generated-runtime byte budget after Pulse + active-window behavior exists; keep 9500 B when practical, but allow the explicitly accepted 10000 B final guard if the supported worst case requires it;
- add pure domain/state-machine tests for cycle, cancellation, completion and boundary timing;
- test Temperature + Pulse, Humidity + Pulse, Time + Pulse and standalone Pulse composition;
- cover Continuous, Cycles and Duration modes;
- cover AUTO/MANUAL transitions, automation fault, hard safety, minimum ON/OFF/debounce interaction and reboot-safe behavior;
- verify History/status explanation for pulse transitions;
- run focused generator/runtime tests, one final full repository gate, responsive/visual checks for new UI, and real Plug acceptance with explicit final relay OFF.

Once Pulse V1 is qualified and stable, resume the existing V1 product plan below rather than immediately expanding the runtime with every advanced Pulse idea.

### 7. Dashboard status polish

After Pulse V1 is stable, improve the operational status layer without casually changing shared card geometry: requested output, final output, reason, automation-fault state and hard-safety state should be understandable at a glance. Pulse phase/progress should integrate into this same status language rather than becoming a separate diagnostics island.

### 8. UX redesign round 2

After History/safety/Pulse/rules stabilize, make the dashboard more status-first while keeping transport/script/firmware diagnostics deeper under Device / Info / Advanced.

### 9. Watchdog, stabilization and v1 feature freeze

Verify heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL interaction matrix, automation-fault and hard-safety recovery, Pulse recovery/cancellation semantics, long soak, script-memory headroom, final hardware matrix and final UX acceptance. Then declare v1 feature freeze.

## V1 completion target

Feature-complete v1 requires:

- Climate temperature / humidity / VPD automation with 1–4 BLE thermometers;
- Time automation;
- Pulse V1 as both the fourth standalone automation type and an optional output mode for Temperature, Humidity and Time;
- optional daily active-window gating for Temperature/Humidity automation, including overnight windows;
- canonical Plug persistence and transport promotion;
- AUTO/MANUAL with separate automation-fault and hard-safety axes;
- capability-correct manual control;
- History / Datalogger with reason/fault/safety/Pulse context;
- Runtime Safety Supervisor;
- accepted timing/rule-composition scope;
- clear dashboard control/status presentation;
- watchdog/recovery/soak stabilization.

History charts are complete and reuse the existing History runtime/data foundation rather than becoming a second history subsystem.

## Post-stabilization growth track — Pulse Advanced

After V1 stabilization / feature freeze, Pulse is the first planned growth area. These capabilities are intentionally recorded now so they are not lost, but they must not expand Pulse V1 scope or delay stabilization.

Candidate Pulse Advanced features:

- **Burst mode** — run a short group such as `ON 5 s / OFF 10 s x 4`, then a longer rest before the next burst;
- **Adaptive Pulse** — vary ON/OFF duty based on distance from a Temperature/Humidity/VPD target, providing simple proportional-like control without introducing a full PID controller;
- **active-window convenience** for standalone Pulse, while still reusing Time + Pulse rather than creating a second scheduler;
- **phase reset/resume policy** when an enabling condition disappears and later returns; V1 defaults to a fresh cycle;
- **configurable completion behavior** only if a real use case justifies anything other than the V1 safe-OFF default;
- **maximum accumulated ON time / duty budget** over a larger window as an additional operational guard where useful;
- richer cycle/burst progress and History diagnostics.

Every Pulse Advanced addition requires another generated-runtime size/headroom audit and must preserve one relay owner, safe-OFF precedence and the shared Pulse engine. The accepted V1 ceiling is 10000 B; post-freeze features must optimize/reuse or be postponed rather than casually raising that ceiling again.

## Post-freeze

Shelly Plug Gen4 is the intended second physical Plug type after v1 freeze. Treat it as a capability/profile-driven compatibility port against the frozen product/runtime contract, not a reason to fork product flows.

Notifications, richer outlier handling, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain later decisions.

## Preserved reference

`golden/climate-ui-20260928` is the intentional frozen recovery/reference branch for the accepted Climate UI. It is not a working branch and should remain until the golden visual contract no longer depends on it.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` when responsive E2E is part of the acceptance surface. Hardware-facing work requires real-device evidence and an explicit final relay state when relay mutation is exercised.
