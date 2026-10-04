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
- deterministic seeded product-matrix hardening is part of the canonical repository gate: 1000 replayable mixed valid/invalid cases plus a persistent regression corpus cover supported Climate/Time/Pulse compositions without replacing responsive or real-device acceptance.
- release hardening includes a read-only Shelly Doctor, redacted support evidence + bounded event journal, fault injection, persistence/reconciliation fuzzing, mobile bundle/polling budgets and reproducible release-quality evidence keyed to the exact commit.

See `docs/ARCHITECTURE.md` for durable ownership/safety contracts and `docs/testing/hardware-matrix.md` for real-device evidence.

## V1 track

### 1. History / Datalogger — completed 2026-09-30

History records enough operational context to explain output changes: climate/VPD, requested/final relay, mode/manual request, reason, automation fault, hard safety and power/current where available. History failures are isolated from relay arbitration.

The mobile UI presents the same typed records through the completed History visualization described below; it does not create a second persistence/runtime path.

### 2. Runtime Safety Supervisor — completed 2026-09-30

Maximum continuous ON, relay-control failures and native Shelly protection errors converge on one first-fault-wins hard-safety latch. Reset remains safe OFF. Plug-owned firmware limits remain the authority for device electrical/thermal ceilings.

### 3. Rule/action expansion — Pulse V1 completed 2026-10-02

Merged foundations/runtime work:

- typed Set action + minimum ON/OFF timing model;
- existing minimum-OFF path remains the cooldown owner;
- pure one-shot Pulse action semantics;
- pure relay debounce model;
- reusable daily time-window condition;
- flat explicit AND/OR condition composition;
- Climate runtime minimum-ON integration;
- Climate runtime relay-debounce integration with one-shot maturity and forced-OFF precedence;
- bounded shared Pulse cycle model with Continuous/Cycles/Duration, initial delay, start phase and safe-OFF completion;
- generated Climate execution gate for optional Pulse and/or active daily window;
- compact persistent execution config with decode/recovery/reconciliation round-trip;
- one-shot Shelly timers for Pulse phases and active-window boundaries;
- qualified Climate composition with MANUAL, automation-fault, hard-safety, minimum ON/OFF and relay debounce;
- qualified Time + Pulse adapter that keeps `DailyTimeAutomationConfig` unchanged, preserves Steady native `Switch.Set` schedules and uses native `Script.Eval` boundaries around the same shared Pulse engine;
- Time + Pulse lifecycle/reconciliation covering install rollback, pause/resume/delete, physical identity, synchronized-clock requirements, exact schedule/script evidence and safe-OFF recovery;
- qualified Standalone Pulse adapter/runtime using the exact same shared Pulse engine with no Climate/Time parent, fresh safe-OFF restart semantics, durable ownership, identity-gated lifecycle and exact script reconciliation.

The pure `RelayPulseAction` / one-shot state machine remains supported. Climate configuration may carry optional `execution.pulse` and/or `execution.activeWindow`; when `execution` is absent, the existing steady Climate config shape and behavior remain unchanged. The generated Climate + Pulse + optional active-window runtime slice is qualified on candidate `fe50778d956906749c00f9da9b7237e6e617c970`. The Time + Pulse runtime/adapter is qualified on candidate `c62f08d252d3d86d3c23ec8f0ad630f3b611a758`. The Standalone Pulse hardware-tested runtime candidate is `bcfb01f5c6e76bcf571ed013bc650f4d847861e6`; later code-only descendant `523b43849d85d7fc0c369ac2d2c23b31182d42f5` adds app-facing model exports without changing generated runtime behavior. The shared Pulse setup/editor UI is accepted on `99ae14745215e5d267ed2588806a1bc0d05c6420` and reuses one form model/component across Climate, Time and standalone Pulse. Operational dashboard/detail phase/progress status is now accepted on `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2`; Pulse V1 is complete. The status implementation reuses Climate diagnostics and read-only `Script.Eval` state for Time/standalone without changing generated runtime behavior. Pulse V1 is defined in section 6.

Advanced rule candidates that remain parked and do **not** block Pulse V1:

- general time-window/scheduled-condition execution inside the Climate rule engine beyond the accepted Time automation + Pulse composition;
- general AND/OR condition execution in the Climate runtime;
- configuration/editor surfaces for those general condition-composition capabilities if they are later accepted.

**Runtime-size policy:** the stabilization baseline is 9431 B / 9500 B for the canonical four-sensor minimum-ON + debounce fixture. Sensor display names are capped at 26 escaped UTF-8 runtime bytes; the pre-Pulse four-sensor, minimum-ON + debounce + VPD matrix peaks at 9496 B / 9500 B. Keep 9500 B as the preferred optimization target and emit new runtime logic only for configurations that use it, but Pulse integration has an explicitly accepted **12000 B hard ceiling**. Do not remove working safety/recovery capability, narrow supported sensor combinations, or perform risky logic/minification refactors solely to defend the old 9500 B target. The qualified Climate mixed-parser worst case is **11332 B**, leaving 668 B headroom. The qualified Time + Pulse adapter representative sizes are **2091 B Continuous / 2112 B Cycles / 2130 B Duration**. The qualified Standalone adapter is smaller again at **1783 B Continuous / 1789 B Cycles / 1803 B Duration**. Time passed script-generator **213/213 tests at 100% statements/branches/functions/lines**, full `pnpm check`, and real Plug S Gen3 firmware 1.7.5 native-boundary acceptance. Standalone passed focused shared-engine/lifecycle/reconciliation gates and real Plug S Gen3 acceptance with observable safe-OFF initial delay, fixed-cycle completion, fresh restart, cancellation and exact production restoration. Detailed evidence is in `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`, `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md` and `docs/testing/pulse-v1-standalone-runtime-acceptance-2026-10-02.md`.

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

### 6. Pulse V1 — completed 2026-10-02

Pulse becomes a first-class automation capability with **one shared pulse-cycle engine** and two product entry points. Do not implement separate temperature-pulse, humidity-pulse, time-pulse or standalone-pulse runtimes.

#### Product model

Automation setup exposes four primary automation types:

1. Temperature;
2. Humidity;
3. Time;
4. Pulse.

Temperature, Humidity and Time additionally support an output behavior selector:

- **Steady** — current normal ON/OFF behavior;
- **Pulse** — when the parent automation requests active output, execute the shared Pulse cycle instead of holding the relay continuously ON.

Temperature and Humidity also support an optional daily **active window**. Outside that window AUTO requests safe OFF; inside it the existing climate condition decides whether output is active. Active windows may cross midnight. Time automation already owns an explicit daily ON/OFF window; the qualified Time + Pulse adapter reuses that native window rather than introducing another scheduler.

Standalone Pulse is the same engine without a climate condition. It is useful for pumps, fans, irrigation, mixers, dosing and other periodic loads.

Examples:

- Temperature + Pulse: below the ON threshold, run `ON 10 s -> OFF 20 s -> ...`; crossing the OFF threshold cancels Pulse and leaves the relay OFF.
- Humidity + Pulse: the same Pulse behavior while the humidity rule requests output.
- Time + Pulse: inside the configured active time window, run the Pulse cycle; when the time window closes, cancel the cycle immediately and leave the relay OFF.
- Standalone Pulse: run the configured cycle continuously, for a number of cycles, or for a bounded total duration.

#### Pulse V1 configuration

Pulse V1 supports:

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
- Standalone Pulse restart starts safe OFF and a fresh configured cycle without any persisted in-flight phase state;
- Pulse must compose with existing minimum ON/OFF, debounce and cooldown ownership without introducing a second timing owner or weakening forced-OFF precedence;
- Pulse transitions must not bypass physical-device identity gates or Runtime Safety Supervisor behavior.

History and operational status must remain explanatory: Pulse-driven relay changes need distinguishable reason/phase information so a user can understand why output toggled. Dashboard/detail status should be able to show at least Pulse active phase and, where practical, remaining time / cycle progress without moving timer ownership into React.

#### Pulse V1 qualification

The generated Climate + Pulse + active-window runtime is qualified as of 2026-10-01. Its acceptance covers Continuous/Cycles/Duration, initial delay/start phase, cancellation/completion boundaries, overnight window behavior, AUTO/MANUAL, automation fault, hard safety, reboot-safe start, minimum ON/OFF/debounce composition, compact diagnostics/history reasons, the supported 12 KB size matrix, full repository gate, and real Plug S Gen3 evidence with explicit final OFF.

The Time + Pulse boot-time clock recovery was requalified on 2026-10-02: an untrusted clock keeps the relay safe OFF and schedules a 30 s recheck; once time becomes trustworthy only the `tm` fault is cleared, while unrelated protection faults remain authoritative. Deterministic runtime coverage passes 14/14 and real Plug S Gen3 smoke verified physical ON/OFF/cancel behavior with byte-identical production restoration and final OFF. See `docs/testing/time-pulse-clock-recovery-acceptance-2026-10-02.md`.

The Time + Pulse adapter/runtime is also qualified as of 2026-10-01. It keeps Steady Time unchanged, composes the existing native daily window with the same shared Pulse engine through `Script.Eval` boundaries, persists Pulse runtime beside the old Time config, covers lifecycle/reconciliation/failure-safe OFF paths, passes the full repository gate, and has real Plug S Gen3 proof using actual native ON/OFF minute boundaries. The native OFF boundary cancelled Pulse state, temporary schedules/script were removed, production source SHA stayed byte-identical, original schedules were restored exactly and final relay state was explicitly verified OFF.

Standalone Pulse adapter/runtime is qualified as of 2026-10-02. It has no Climate/Time parent, embeds the exact shared Pulse engine, reuses durable ownership/identity/lifecycle/reconciliation patterns, starts/restarts from explicit safe OFF without persisted timer state, and covers bounded validation, Continuous/Cycles/Duration, initial delay/start phase, fixed completion, cancellation, relay-control failure and native switch protection. Real Plug S Gen3 acceptance observed safe-OFF initial delay, physical ON/OFF cycles, safe completion, fresh restart/cancel behavior, explicit final OFF and exact restoration of the production script/source/state.

Shared setup/editor UI and responsive visual acceptance are qualified as of 2026-10-02 on `99ae14745215e5d267ed2588806a1bc0d05c6420`. One `PulseCycleEditor` and one pulse form model are reused by Climate, Time and standalone Pulse. Climate/Time expose compact Steady/Pulse output behavior; standalone Pulse uses the same editor directly. Canonical visual states `24-climate-pulse-setup`, `25-time-pulse-setup` and `26-standalone-pulse-setup` are committed, while the frozen Climate detail golden remains unchanged.

Operational dashboard/detail status is also qualified as of 2026-10-02 on `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2`. One normalized read-only Pulse operational-status model is shared across Climate, Time and standalone Pulse. Climate maps its existing `/diag` state; Time + Pulse and standalone Pulse read the already-running shared-engine state through typed read-only `Script.Eval` and combine it with the actual Shelly relay state. The phone derives remaining display time from device uptime/deadline values but never owns Pulse timing. Compact dashboard and full detail presentation use the existing requested/final-output, reason, automation-fault and hard-safety language rather than a separate diagnostics island.

Operational-status acceptance passed focused responsive E2E **5/5**, full `pnpm check`, and the complete responsive Playwright suite **46/46** on the exact implementation head. The same application code was built and installed on Samsung SM-S906B / Android 16 with `adb install -r`, preserving app data and passing cold-start/411 px no-overflow smoke. The preserved phone state contains a steady Climate installation rather than Pulse, so that Android smoke is not claimed as live Pulse status hardware proof. Generated runtime was unchanged, therefore runtime size and relay-hardware requalification were not repeated.

Pulse V1 is complete. The 2026-10-03 UX polish round is also closed: Time/standalone Pulse status hierarchy, nested Thermometer settings, capability-driven Plug Detail, shared setup navigation and shared Plug feedback ownership are accepted. Safe standalone Pulse replacement is merged via PR #83, and temporary BLE discovery restoration is generalized to preserve recognized Climate and standalone Pulse runtime state. The default remaining work is watchdog/recovery/soak stabilization, the final real-hardware matrix, and V1 feature freeze/release qualification. Active standalone Pulse BLE scan UI is technically unblocked but remains a separate explicit product/UX slice.

### 7. Dashboard status polish — slice 1 accepted 2026-10-02

The first post-Pulse status slice is accepted on `08a50db96f126e04dd509c246581939aabcde3d6`. One mobile presentation primitive now owns the common requested-output, final-relay and reason language used by Pulse and Steady Time. Pulse keeps the already-qualified normalized read model. Steady Time derives requested output only from Shelly local time and the existing schedule-domain helper while AUTO is running; paused/MANUAL deliberately reports no automation request. Climate detail prefers the authoritative automation-requested diagnostic with the previous relay-state fallback for older snapshots.

The frozen Climate dashboard/detail golden UI remains unchanged. The implementation deliberately backed out a steady-Climate dashboard geometry change after the UX gate proved that it violated the accepted golden contract. Only the intentional Time dashboard/detail snapshots were refreshed. Complete responsive Playwright passed **46/46** and the exact completion code passed full `pnpm check`. No runtime, transport, polling, persistence, relay or hardware semantics changed.

Continue Stage 7 with broader automation-fault and hard-safety legibility using existing authoritative diagnostics and existing warning/footer/detail surfaces before introducing any new state or transport owner. Pulse phase/progress remains integrated into the same status vocabulary rather than becoming a diagnostics island.

### 8. UX redesign round 2

After History/safety/Pulse/rules stabilize, make the dashboard more status-first while keeping transport/script/firmware diagnostics deeper under Device / Info / Advanced.

### 9. Watchdog, stabilization and v1 feature freeze

Verify heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL interaction matrix, automation-fault and hard-safety recovery, Pulse recovery/cancellation semantics, long soak, script-memory headroom, final hardware matrix and final UX acceptance. Then declare v1 feature freeze.

The 2026-10-04 short soak/liveness-observability slice is qualified without adding a new runtime heartbeat: a post-processor derives device reboot evidence from uptime regression, endpoint and `/diag` outage windows, stopped-script streaks and first/last uptime from the existing soak JSONL. Real Plug S Gen3 smoke passed 12/12 read-only samples over about 55 s with zero reboot/outage/stopped-script findings and `mem_free` staying at or above 19334 B. This closes the observability/tooling gap only; deliberate reboot/power-cycle recovery, Wi-Fi/BLE loss/recovery, the full AUTO/MANUAL + automation-fault + hard-safety matrix, a materially longer soak and the final real-hardware matrix remain before feature freeze. Detailed evidence is in `docs/testing/soak-liveness-stabilization-acceptance-2026-10-04.md`.

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

## Post-stabilization growth track — Environment Profiles

Environment Profiles are the planned grow/greenhouse/terrarium-specific layer above the existing Climate, Time and Pulse primitives. They should model the desired environment directly instead of forcing users to duplicate independent automations for different parts of the day.

The first slice is **Day / Night**:

- configurable day and night boundaries, including schedules that cross midnight;
- separate Temperature targets/thresholds for day and night;
- separate Humidity targets/thresholds for day and night;
- separate VPD targets for day and night;
- optional phase-specific Pulse configuration where useful;
- optional phase-specific minimum ON/OFF timing where a real device/use case requires it;
- local phase switching on Shelly without requiring the phone or cloud to remain available;
- safe behavior when wall-clock time is unavailable or untrusted, reusing the existing synchronized-clock and forced-OFF principles rather than inventing a second time owner.

The configuration model should be extensible from Day/Night to **Dawn / Day / Dusk / Night** without replacing the runtime architecture. Later phases may support gradual ramps/transitions rather than instantaneous target changes when this materially improves plant, greenhouse or terrarium control.

Environment Profiles must reuse the existing Climate/VPD/Pulse engines, relay ownership, diagnostics, History, MANUAL behavior, automation-fault handling and hard-safety precedence. A profile selects the active parameter set; it must not become another relay owner.

The product UX should present this as an environment schedule/profile (for example `Day 06:00–22:00` and `Night 22:00–06:00`) rather than as a collection of low-level smart-home scenes.

A lightweight follow-up candidate is **Dew Point / condensation risk**, derived from the Temperature and Humidity data already available. Prefer calculating and presenting it in the app/History first so it adds no generated Shelly runtime bytes. A local Dew Point automation trigger should only be added later if a runtime-size/headroom audit shows that it fits without weakening existing safety/recovery capability or raising the accepted script ceiling.

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

Every Pulse Advanced addition requires another generated-runtime size/headroom audit and must preserve one relay owner, safe-OFF precedence and the shared Pulse engine. The accepted V1 hard ceiling is 12000 B; post-freeze features must optimize/reuse or be postponed rather than casually raising that ceiling again.

## Post-freeze

Shelly Plug Gen4 is the intended second physical Plug type after v1 freeze. Treat it as a capability/profile-driven compatibility port against the frozen product/runtime contract, not a reason to fork product flows.

Notifications, richer outlier handling, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain later decisions.

## Preserved reference

`golden/climate-ui-20260928` is the intentional frozen recovery/reference branch for the accepted Climate UI. It is not a working branch and should remain until the golden visual contract no longer depends on it.

## Working rule

Prefer small vertical slices, focused regressions and one final full repository gate. Use `pnpm check:full` when responsive E2E is part of the acceptance surface. Hardware-facing work requires real-device evidence and an explicit final relay state when relay mutation is exercised.
