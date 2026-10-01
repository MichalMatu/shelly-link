# Handoff — Pulse V1 after Time + Pulse qualification

Status: **2026-10-01 — Climate + Pulse + optional active-window and Time + Pulse runtime slices are qualified. Standalone Pulse and Pulse UI/status remain. The accepted hard generated-script ceiling is 12000 B; 9500 B is only a preferred optimization target and must not justify risky logic changes.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main`, `pulse-v1-runtime-integration`, `pulse-v1-time-adapter` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md`, `docs/UX_VISUAL_CONTRACT.md`, `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md` and `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; never reuse an old conversation binding without verifying it.
4. Confirm there is no active Local Agent task and no duplicate/open PR before continuing.
5. Keep `main` untouched until the working branch is reviewed/merged. The accepted pre-Pulse `main` baseline remains `a2297e3040d98916782af5327a635b45375b19e1`.
6. Use direct GitHub for repository audit/changes. Use Local Agent for every Mac/local build, test, Playwright or real-device operation.
7. Any relay-mutating real-device test must finish with explicit relay OFF and verification.

## Qualified candidates

### Climate + Pulse

- branch: `pulse-v1-runtime-integration`
- qualified runtime/code candidate: `fe50778d956906749c00f9da9b7237e6e617c970`
- later accepted parent used for the Time slice: `c760e79493582140788be76034acea8daf3ed7fb`
- supported mixed-parser worst-case generated size: **11332 B**
- real Plug S Gen3 acceptance passed on `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`, firmware `1.7.5`
- full details: `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`

### Time + Pulse

- branch: `pulse-v1-time-adapter`
- qualified runtime/code candidate: `c62f08d252d3d86d3c23ec8f0ad630f3b611a758`
- acceptance-document commit follows the code candidate and is documentation-only
- final representative generated sizes:
  - Continuous: **2091 B**
  - Cycles: **2112 B**
  - Duration: **2130 B**
- script-generator qualification: **213/213 tests**, **100% statements / branches / functions / lines**
- full repository `pnpm check`: exit 0 on the exact runtime/code candidate, clean worktree
- real Plug S Gen3 native-schedule acceptance: passed with explicit final OFF and exact restoration of production script/schedules
- full details: `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md`

No PR/merge for the Time + Pulse branch has been performed yet. Do not assume it is on `main`.

## Pulse V1 product shape

Pulse is one first-class capability with one shared Pulse-cycle engine. Automation setup is intended to expose four primary automation types:

1. Temperature;
2. Humidity;
3. Time;
4. Pulse.

Temperature, Humidity and Time additionally support an output behavior choice:

- **Steady** — existing normal relay behavior;
- **Pulse** — while the parent automation requests active output, execute the shared Pulse cycle.

Temperature and Humidity additionally support an optional daily active window, including overnight windows. Existing Steady Time remains the native Shelly schedule contract. Standalone Pulse must reuse the same cycle engine without a climate/time parent.

Do not create separate temperature-pulse, humidity-pulse or time-pulse cycle engines.

## Qualified Climate runtime contract

The Climate execution slice is closed and should not be reopened without concrete evidence:

- compact persistent optional Pulse (`e`) and active-window (`w`) runtime config with decode/recovery/reconciliation round-trip;
- one execution gate between Climate parent request and the existing relay arbiter;
- Shelly one-shot timers for Pulse phases and active-window boundaries;
- Continuous, Cycles and Duration modes, initial delay, ON/OFF start phase and safe-OFF completion;
- Shelly local-time authority with overnight window semantics and fail-safe OFF for untrusted time;
- MANUAL, parent inactive, automation fault, hard safety and window close cancel Pulse immediately;
- existing relay arbiter remains the owner of minimum ON/OFF, debounce and final relay mutation;
- diagnostics/history remain explanatory through execution state plus requested/final relay and reason codes;
- runtime config update cancels stale Pulse/window timers when execution is changed or removed.

Current Climate hard size guard: `SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES = 12000`.

## Qualified Time + Pulse contract

`DailyTimeAutomationConfig` remains unchanged. Time + Pulse is an explicit composition beside it:

- Steady Time still installs exactly two native `Switch.Set` schedules and no script;
- Time + Pulse persists optional `pulseRuntime: { script, pulse }` beside the existing Time config/schedule IDs;
- Time + Pulse installs one run-on-boot script plus two native daily schedule jobs;
- native ON boundary calls `Script.Eval(id, "rq(true)")`;
- native OFF boundary calls `Script.Eval(id, "rq(false)")`;
- the script owns Pulse phase timers only; native Shelly schedules remain the daily-window owner;
- boot starts safe OFF and evaluates the current daily window once for restart recovery;
- the exact shared `renderPulseCycleExecution()` engine is reused rather than forked;
- install, partial rollback, pause, resume, failed-resume rollback and delete all preserve safe-OFF semantics;
- destructive lifecycle operations verify stored physical Shelly identity first;
- unsynchronized Shelly clock blocks installation/resume where correct daily-window recovery cannot be trusted;
- reconciliation requires both the exact `Script.Eval` schedule pair and the expected running script ID/hash;
- the legacy Steady Time updater rejects Time + Pulse before any RPC so it cannot silently overwrite the composed runtime.

Real-device proof used an actual native one-minute window (`23:15` to `23:16`), not manual start/cancel injection. The native ON boundary produced repeated physical Pulse ON/OFF transitions; the native OFF boundary cleared Pulse state and left relay OFF. Temporary schedules/script were removed, the production runtime SHA remained byte-identical (`eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`), original schedule set was restored exactly, and final production state was MANUAL/OFF/unlocked at 0 W / 0 A.

## Pulse V1 configuration contract

V1 remains bounded to:

- ON time;
- OFF time;
- Continuous mode;
- fixed Cycles mode;
- bounded total Duration mode;
- optional initial delay;
- selectable start phase (ON/OFF), with ON as the simple default;
- safe OFF after completion/cancellation;
- one-shot Pulse as the simple/degenerate form of the same foundation;
- explicit validation/bounds for time/count inputs.

Do not enlarge this list while closing the remaining V1 slices.

## Required semantics

- Pulse never becomes a second relay owner.
- Hard safety and forced-OFF paths cancel Pulse immediately and leave OFF.
- Automation faults that require OFF cancel Pulse immediately.
- Temperature/Humidity parent inactive cancels immediately rather than finishing a cycle.
- Time + Pulse runs only inside the native Time window; window close cancels immediately and leaves OFF.
- MANUAL suspends/cancels Pulse; AUTO starts a fresh configured cycle when the parent is active.
- Reboot/power-cycle starts safe OFF; never resume an unknown in-flight timer.
- Existing minimum ON/OFF, debounce and cooldown ownership must compose with Pulse rather than being duplicated.
- React may present Pulse state/progress but never owns Pulse timers.

## What remains for Pulse V1

Do **not** call all Pulse V1 complete yet. The next implementation order is:

1. **Standalone Pulse adapter/runtime** using the exact same shared Pulse-cycle engine. Keep it lightweight and preserve one relay owner / safe-OFF precedence.
2. **Pulse setup/editor UI** shared across Climate, Time and standalone Pulse. Follow the compact optional-control pattern used by VPD rather than creating unrelated forms.
3. **Responsive/visual acceptance** for the new setup/editor surfaces.
4. **Dashboard/detail Pulse status presentation** if accepted by product UX, integrated into the existing requested/final output, reason, automation-fault and hard-safety language.
5. Final Pulse V1 cross-mode regression/hardware matrix only where the remaining slices change runtime/hardware behavior.

Do not reopen or further minify the qualified Climate or Time runtimes unless a concrete failing test, hardware issue or size regression justifies it.

## Existing V1 foundation that remains accepted

History/Datalogger, Runtime Safety Supervisor, History charts, minimum ON/OFF, relay debounce, AUTO/MANUAL ownership, canonical Plug identity and the existing Climate visual contract remain accepted foundations. Use `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/UX_VISUAL_CONTRACT.md` and `docs/testing/hardware-matrix.md` for their durable contracts instead of re-deriving them from old chats.

## Sequence after Pulse V1

After Pulse V1 is qualified and stable:

1. Dashboard status polish;
2. UX redesign round 2;
3. watchdog/stabilization: heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL matrix, fault/safety recovery, Pulse cancellation/recovery, soak, memory headroom, final hardware matrix and UX acceptance;
4. v1 feature freeze.

After V1 stabilization/freeze, return to the Pulse Advanced backlog preserved in `docs/ROADMAP.md`. Those ideas must not enlarge Pulse V1 or bypass size/safety gates.

## Performance rule

`docs/PERFORMANCE_HANDOFF.md` is the source of truth for Local Agent performance work. Do not infer a host migration from personal hardware ownership; verify the active host before resuming any performance/concurrency/cache campaign. Run only one heavy build/test workload at a time.

## Verification rule

Use the normal repository loop: architecture/UX gate -> smallest cohesive implementation -> focused checks -> responsive/visual evidence when geometry changes -> real-device evidence when relevant -> final full repository gate on the exact qualified state -> cleanup temporary branches/artifacts. If real Shelly runtime is touched, use identity-first access and finish with explicitly verified relay OFF.
