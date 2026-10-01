# Handoff — Pulse V1 runtime integration

Status: **2026-10-01 — the generated Climate + Pulse + optional active-window runtime slice is qualified on `pulse-v1-runtime-integration`; Time + Pulse, standalone Pulse and Pulse UI remain later Pulse V1 slices. The accepted hard generated-script ceiling is 12000 B, with 9500 B retained only as a preferred optimization target.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main`, `pulse-v1-runtime-integration` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md`, `docs/UX_VISUAL_CONTRACT.md` and `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; never reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no duplicate/open PR before continuing.
5. Keep `main` untouched until the working branch is reviewed/merged. The accepted pre-integration baseline is `a2297e3040d98916782af5327a635b45375b19e1`.
6. Keep 9500 B as a preferred generated-runtime target, but enforce **12000 B as the accepted hard ceiling**. Do not remove safety/recovery behavior, narrow supported sensor combinations or perform risky logic/minification refactors solely to save bytes.

The qualified runtime/code candidate is `fe50778d956906749c00f9da9b7237e6e617c970`. The supported worst case — four sensors with mixed BTHome/TP357 parsers, maximum runtime display-name budget, VPD, minimum ON, debounce, large timing values, Pulse and an overnight active window — generated **11332 B**, leaving **668 B** headroom. Script-generator qualification passed **201/201 tests with 100% statements/branches/functions/lines**, and the exact code candidate passed the full repository `pnpm check` with a clean worktree.

Real Plug S Gen3 acceptance also passed on `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`, firmware `1.7.5`. The 11332 B worst-case runtime loaded and started cleanly with relay OFF. A real TP357 advertisement then drove the normal generated path through a physical **OFF -> ON -> OFF** Pulse transition. Cleanup deleted the temporary runtime, explicitly verified final relay OFF at 0 W / 0 A, restored the original production runtime as the only running script and preserved its source SHA byte-for-byte. Full details are in `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`.

## Accepted History baseline

History remains one read-only presentation over the existing Climate History v2 foundation:

- History v2 runs inside the single managed Climate runtime and stores records in the namespaced/versioned `shellylink.history.*` KVS ring;
- the mobile read path and `HistoryRecord[]` contract are unchanged;
- History writes remain observational and failure-isolated from relay/safety arbitration;
- loading, retry, empty and partial-corruption handling remain explicit;
- no History presentation component owns Shelly transport, BLE, KVS or durable storage side effects.

The accepted chart UX has five compact vertical panels in this order: Temperature, Humidity, Output, Power and Current. Each continuous metric has an independent real-unit Y scale. Output is a square digital step track. All panels share the same truthful time domain. There is no interactive legend, tooltip or crosshair in the accepted phone design. VPD remains in the typed History/scaling layer but is intentionally omitted from the five-panel stack.

The previously stale History responsive contract is closed: the Current assertion matches the encoded fixture (`currentMilliA=200` -> `0,2 A` in Polish locale), the canonical Darwin `23-climate-history` snapshot was deliberately refreshed, final `pnpm check` passed, and the full responsive suite passed 36/36 on the accepted History baseline. Do not reopen that work without concrete evidence.

## Pulse V1 product shape

Pulse is a first-class automation capability with one shared Pulse-cycle engine. Automation setup should expose four primary automation types:

1. Temperature;
2. Humidity;
3. Time;
4. Pulse.

Temperature, Humidity and Time additionally support an output behavior choice:

- **Steady** — existing normal relay behavior;
- **Pulse** — while the parent automation requests active output, execute the shared Pulse cycle.

Temperature and Humidity additionally support an optional daily active window, including windows that cross midnight. Existing steady Time remains the native Shelly schedule contract; do not overload `DailyTimeAutomationConfig`. Time + Pulse must compose the existing daily window with the shared Pulse engine through an explicit runtime model. Standalone Pulse uses the same engine without a climate parent condition.

Do not build separate temperature-pulse, humidity-pulse and time-pulse runtimes.

## Qualified Climate runtime slice

The working branch now carries the qualified Climate execution integration, still without Pulse UI:

- compact persistent runtime representation for optional Pulse (`e`) and active window (`w`), with decode/recovery/reconciliation round-trip;
- a generated execution gate between the Climate parent request and the existing relay arbiter;
- local one-shot Shelly `Timer` ownership for Pulse phase transitions and daily window boundaries rather than phone timers or one-second polling;
- Continuous, Cycles and Duration Pulse representation, optional initial delay, ON/OFF start phase and safe-OFF completion;
- active-window evaluation from Shelly `sys.time` / `unixtime`, including overnight windows and fail-safe OFF when local time is not trustworthy;
- MANUAL, automation-fault, hard-safety, parent-inactive and active-window-close paths cancel Pulse rather than allowing a cycle to finish;
- the existing relay arbiter remains the single owner of minimum ON/OFF, debounce and final relay mutation;
- relay maturity waits can complete from one-shot timers rather than depending on a later BLE measurement;
- diagnostics expose execution state compactly while existing History records continue to explain transitions through requested/final relay plus reason codes;
- runtime config update cancels stale Pulse/window timers even when the new config removes `execution`;
- the generated runtime retains both supported BLE parsers. A parser-specialization experiment was deliberately removed after it caused false capability rejection in persistent runtime config tests; with the accepted 12 KB ceiling the complexity/risk was not justified.

The current size guard is `SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES = 12000`.

## Pulse V1 configuration

V1 scope remains bounded:

- ON time in seconds;
- OFF time in seconds;
- Continuous mode;
- fixed Cycles mode;
- bounded total Duration mode;
- optional initial delay;
- selectable start phase (ON/OFF), with ON as the simple default;
- safe OFF end state after completion/cancellation;
- one-shot Pulse retained as the simple/degenerate form of the same foundation;
- explicit validation and bounds for time/count inputs.

The Pulse controls should follow the compact optional-control pattern already used by VPD when UI work begins. Standalone Pulse gets a dedicated setup surface but reuses the same Pulse configuration/model.

## Required semantics

- Pulse never becomes a second relay owner; one Plug relay still has one managed automation owner.
- Hard safety and forced-OFF paths cancel Pulse immediately and leave the relay OFF.
- Automation faults that require OFF cancel Pulse immediately.
- Temperature/Humidity parent condition becoming inactive cancels immediately rather than finishing a cycle.
- Time + Pulse cycles only inside the active Time window; the window closing cancels immediately and leaves OFF.
- MANUAL relay control suspends/cancels Pulse; returning to AUTO starts a fresh cycle from the configured start phase if the parent condition is active.
- Reboot/power-cycle starts safe OFF; never resume an unknown in-flight timer. Re-evaluate the parent condition and start a fresh cycle only after runtime state is rebuilt.
- Existing minimum ON/OFF, debounce and cooldown ownership must compose with Pulse rather than being duplicated.
- History/status must be able to explain Pulse-driven transitions; React may display phase/progress but must not own timers.

## What remains after Climate runtime qualification

Do **not** call all of Pulse V1 complete yet. The Climate + Pulse runtime slice above is qualified; the next implementation slices are:

1. Time + Pulse composition using the existing Time daily window without changing `DailyTimeAutomationConfig` or replacing native steady schedules;
2. standalone Pulse runtime/adapter reusing the same shared Pulse-cycle engine;
3. Pulse setup/editor UI and responsive/visual acceptance;
4. dashboard/detail Pulse status presentation where accepted by the product UX.

Keep those slices explicit. Do not reopen the qualified Climate runtime or continue minifying it unless a concrete failing test, hardware issue or size regression justifies a change.

## Sequence after Pulse V1

Once Pulse V1 is qualified and stable, resume the existing V1 roadmap rather than immediately expanding every Pulse idea:

1. Dashboard status polish — make requested output, final relay output, reason, automation fault, hard safety and Pulse phase understandable at a glance;
2. UX redesign round 2 — make the product more status-first while keeping transport/script/firmware diagnostics under Device / Info / Advanced;
3. Watchdog/stabilization — heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL matrix, fault/safety recovery, Pulse cancellation/recovery, soak, memory headroom, final hardware matrix and UX acceptance;
4. v1 feature freeze.

After V1 stabilization/freeze, return to Pulse as the first growth track. `docs/ROADMAP.md` preserves the Advanced backlog. Those ideas must not enlarge Pulse V1 or bypass runtime-size/safety gates.

## Performance rule

`docs/PERFORMANCE_HANDOFF.md` is the source of truth for Local Agent performance work. Do not infer a host migration from personal hardware ownership; verify the active host before resuming any performance/concurrency/cache campaign. Run only one heavy build/test workload at a time.

## Verification rule

Use the normal repository loop: architecture/UX gate -> smallest cohesive implementation -> focused checks -> responsive/visual evidence when geometry changes -> real-device evidence when relevant -> final full repository gate on the exact qualified state -> cleanup temporary branches/artifacts. If real Shelly runtime is touched, use identity-first access and finish with explicitly verified relay OFF.
