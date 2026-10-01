# Handoff — Pulse V1 after Climate + Time + Standalone runtime qualification

Status: **2026-10-02 — Climate + Pulse, Time + Pulse and Standalone Pulse runtime slices are qualified. Shared Pulse UI/status work remains.**

Repository: `MichalMatu/shelly-link`

## Source of truth

Do not reconstruct state from an old chat. Start from the repository and fresh Local Agent state.

Read in this order:

1. `AGENTS.md`;
2. this file;
3. `docs/ARCHITECTURE.md`;
4. `docs/ROADMAP.md`;
5. `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`;
6. `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md`;
7. `docs/testing/pulse-v1-standalone-runtime-acceptance-2026-10-02.md`;
8. `docs/PERFORMANCE_HANDOFF.md` only if build/agent performance work is relevant;
9. `docs/UX_VISUAL_CONTRACT.md` before Pulse UI work.

Then fetch fresh `main`, the active Pulse branches and `agent-control:.agent/status/daemon.json`. Verify there is no active duplicate task or open PR before changing anything. Never copy a Local Agent binding from this document or an older chat.

## Branch and qualification state

Keep `main` untouched until the Pulse working line is deliberately reviewed/merged.

- accepted pre-Pulse `main`: `a2297e3040d98916782af5327a635b45375b19e1`;
- Climate + Pulse branch: `pulse-v1-runtime-integration`;
- qualified Climate runtime/code candidate: `fe50778d956906749c00f9da9b7237e6e617c970`;
- later accepted Climate parent used by Time work: `c760e79493582140788be76034acea8daf3ed7fb`;
- Time + Pulse branch: `pulse-v1-time-adapter`;
- qualified Time runtime/code candidate: `c62f08d252d3d86d3c23ec8f0ad630f3b611a758`;
- Standalone Pulse branch: `pulse-v1-standalone-adapter`;
- hardware-tested Standalone runtime/code candidate: `bcfb01f5c6e76bcf571ed013bc650f4d847861e6`;
- later Standalone code-only descendant before documentation: `523b43849d85d7fc0c369ac2d2c23b31182d42f5`.

The Time and Standalone branches contain documentation-only commits after their qualified code candidates. Fetch fresh branch HEADs rather than assuming chat-copied documentation SHAs.

No Pulse PR/merge has been performed yet. Do not assume any Pulse work is on `main`.

Durable remote branches should now be limited to the active control/baseline/reference lines:

- `main`;
- `agent-control`;
- `golden/climate-ui-20260928`;
- `pulse-v1-runtime-integration`;
- `pulse-v1-time-adapter`;
- `pulse-v1-standalone-adapter`.

## Qualified product/runtime contract

Pulse is one capability with one shared Pulse-cycle engine. Do not create separate temperature-pulse, humidity-pulse, time-pulse or standalone-pulse engines.

Pulse V1 configuration remains bounded to:

- ON time;
- OFF time;
- Continuous mode;
- fixed Cycles mode;
- bounded Duration mode;
- optional initial delay;
- ON/OFF start phase;
- safe OFF completion/cancellation;
- explicit input bounds.

The accepted generated-script hard ceiling is **12000 B**. **9500 B is only a preferred optimization target.** Do not remove safety/recovery behavior, narrow supported sensors or perform risky minification solely to defend 9500 B.

### Climate + Pulse — closed runtime slice

The qualified Climate execution layer:

- reuses the existing Climate parent condition and relay arbiter;
- supports optional Pulse and optional daily active window, including overnight windows;
- uses Shelly one-shot timers for Pulse/window boundaries;
- cancels immediately for parent inactive, MANUAL, automation fault, hard safety or window close;
- composes with existing minimum ON/OFF and relay debounce instead of owning the relay directly;
- persists compact execution config and keeps diagnostics/History explanatory;
- preserves existing Steady Climate behavior when execution config is absent.

Qualified supported mixed-parser worst case: **11332 B**. Software and real Plug S Gen3 acceptance are recorded in `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md`.

### Time + Pulse — closed runtime slice

`DailyTimeAutomationConfig` remains unchanged.

- Steady Time remains exactly two native `Switch.Set` schedules and no script;
- Time + Pulse stores optional Pulse runtime metadata beside the existing Time config;
- one run-on-boot script owns Pulse phase timers only;
- native daily ON/OFF schedules remain the Time-window owner and call `Script.Eval` with `rq(true)` / `rq(false)`;
- boot starts safe OFF and re-evaluates the current daily window once;
- install/rollback/pause/resume/delete preserve explicit safe-OFF semantics;
- physical identity and synchronized-clock requirements are enforced where required;
- reconciliation requires the exact schedule pair plus expected running script ID/hash;
- the legacy Steady updater rejects Time + Pulse before RPC mutation.

Representative generated sizes: **2091 B Continuous / 2112 B Cycles / 2130 B Duration**. The qualified candidate passed script-generator **213/213 tests at 100% coverage**, full repository `pnpm check`, and real Plug S Gen3 native-schedule acceptance. Full evidence is in `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md`.

### Standalone Pulse — closed runtime slice

Standalone Pulse has no Climate or Time parent and still reuses the exact same `renderPulseCycleExecution()` engine.

- typed config is `{ relayId, pulse }` with the existing bounded Pulse model;
- boot explicitly forces relay OFF before starting a fresh cycle;
- transient phase/timer state is never persisted or resumed across restart;
- `rq(true)` starts a fresh parentless cycle and `rq(false)` cancels immediately to OFF;
- relay-control failure and native switch protection fault safe OFF and latch start inhibition;
- durable ownership uses the existing `InstalledAutomation` record with `kind: "pulse"`;
- one-owner-per-relay checks, physical identity gates and existing script install lifecycle are reused;
- install/pause/resume/delete all include explicit safe-OFF handling;
- reconciliation requires the expected running script ID and generated-code hash.

Representative generated sizes: **1783 B Continuous / 1789 B Cycles / 1803 B Duration**. Software tests and real Plug S Gen3 acceptance are recorded in `docs/testing/pulse-v1-standalone-runtime-acceptance-2026-10-02.md`.

Do not reopen or further minify any qualified runtime slice without a concrete failing test, hardware issue or size regression.

## Next implementation order

Pulse V1 is **not complete**. Continue in this order:

1. **Shared Pulse setup/editor UI** for Climate, Time and standalone Pulse. Reuse one configuration model/component; follow the compact optional-control pattern used by VPD.
2. **Responsive/visual acceptance** for the new setup/editor surfaces.
3. **Dashboard/detail Pulse phase/progress/status** only in the existing requested/final output, reason, automation-fault and hard-safety language.
4. Final cross-mode regression/hardware checks only where the remaining slices change generated runtime or real-device behavior.

After Pulse V1 is stable, resume Dashboard status polish, UX redesign round 2, watchdog/stabilization and v1 feature freeze from `docs/ROADMAP.md`.

## Safety and execution rules

- Pulse never becomes a second relay owner.
- Forced OFF, hard safety and OFF-requiring automation faults cancel Pulse immediately.
- Parent inactive/window close cancels immediately rather than finishing a cycle.
- MANUAL cancels/suspends Pulse; returning to AUTO starts a fresh configured cycle when the parent is active.
- Standalone restart begins safe OFF and starts a fresh configured cycle; never resume an unknown in-flight timer.
- React may display phase/progress but never owns Pulse timers.
- Use direct GitHub for repository audit/changes and Local Agent for Mac/local commands, builds, tests, Playwright and hardware.
- Any real-device relay-mutating test must end with explicit relay OFF and verification.
- Run focused checks while iterating and one final full `pnpm check` on the exact completion state. Use `pnpm check:full` when responsive E2E is part of acceptance.
