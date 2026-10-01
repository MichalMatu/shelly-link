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
8. `docs/UX_VISUAL_CONTRACT.md` before Pulse UI work.

Then fetch fresh `main`, all active Pulse branches and `agent-control:.agent/status/daemon.json`. Verify there is no active/duplicate task or open PR before changing anything. Never copy a Local Agent binding from this document or an older chat.

## Branch and qualification state

Keep `main` untouched until the Pulse working line is deliberately reviewed/merged.

- accepted pre-Pulse `main`: `a2297e3040d98916782af5327a635b45375b19e1`;
- Climate + Pulse branch: `pulse-v1-runtime-integration`;
- qualified Climate runtime/code: `fe50778d956906749c00f9da9b7237e6e617c970`;
- accepted Climate parent used by Time: `c760e79493582140788be76034acea8daf3ed7fb`;
- Time + Pulse branch: `pulse-v1-time-adapter`;
- qualified Time runtime/code: `c62f08d252d3d86d3c23ec8f0ad630f3b611a758`;
- Standalone Pulse branch: `pulse-v1-standalone-adapter`;
- hardware-tested Standalone runtime/code: `bcfb01f5c6e76bcf571ed013bc650f4d847861e6`;
- final Standalone code-only qualification candidate before durable closeout: `452b69d957dcc0f4d4efb5c777a5c186bfdbc247`.

The Standalone descendants after the hardware candidate add app ownership/reconciliation integration, repository-boundary cleanup, tests and durable docs; they do not change the generated Standalone Shelly runtime. The code-only candidate passed full `pnpm check` with a clean worktree, and `@lcl/script-generator` passed **229/229 tests at 100% statements/branches/functions/lines**.

No Pulse PR/merge has been performed. Fetch fresh branch HEADs instead of assuming a documentation SHA is still current.

Durable remote branches should be limited to:

- `main`;
- `agent-control`;
- `golden/climate-ui-20260928`;
- `pulse-v1-runtime-integration`;
- `pulse-v1-time-adapter`;
- `pulse-v1-standalone-adapter`.

## Qualified runtime contract

Pulse is one capability with one shared Pulse-cycle engine. Do not create separate temperature-pulse, humidity-pulse, time-pulse or standalone-pulse engines.

Pulse V1 remains bounded to ON/OFF time, Continuous/Cycles/Duration, optional initial delay, ON/OFF start phase, safe-OFF completion/cancellation and explicit input bounds.

The hard generated-script ceiling is **12000 B**. **9500 B is only a preferred optimization target.** Never remove safety/recovery, narrow supported configurations or perform risky minification only to defend 9500 B.

### Climate + Pulse — closed

Climate reuses the existing parent condition and relay arbiter, supports optional Pulse/active window including overnight windows, and cancels immediately for parent inactive, window close, MANUAL, automation fault or hard safety. Minimum ON/OFF and debounce remain existing timing owners. Worst qualified mixed-parser size: **11332 B**.

### Time + Pulse — closed

Steady Time remains two native `Switch.Set` schedules and no script. Time + Pulse keeps `DailyTimeAutomationConfig` unchanged, uses one run-on-boot Pulse script plus native ON/OFF `Script.Eval` schedule boundaries, and reuses the shared engine. Lifecycle/reconciliation/identity/clock behavior is qualified. Representative sizes: **2091 / 2112 / 2130 B** for Continuous/Cycles/Duration.

### Standalone Pulse — closed

Standalone has no Climate or Time parent and reuses the exact same `renderPulseCycleExecution()` engine.

- config: `{ relayId, pulse }`;
- boot starts with explicit relay OFF and a fresh cycle;
- transient phase/timer state is never persisted/resumed;
- `rq(true)` starts and `rq(false)` cancels to OFF;
- relay-control failure and native switch protection fail safe OFF;
- durable ownership is existing `InstalledAutomation` with `kind: "pulse"`;
- existing one-owner-per-relay, identity, lifecycle and script ID/hash reconciliation patterns are reused;
- install/pause/resume/delete preserve explicit safe-OFF semantics.

Representative generated sizes: **1783 / 1789 / 1803 B** for Continuous/Cycles/Duration. Real Plug S Gen3 acceptance verified boot/restart safe OFF, two physical cycles, cancellation, explicit final OFF, temporary-script cleanup and byte-identical production restoration. See the dated Standalone acceptance record for full evidence.

Do not reopen or further minify any qualified runtime slice without a concrete failing test, hardware issue or size regression.

## Next implementation order

Pulse V1 is **not complete**. Continue in this order:

1. **Shared Pulse setup/editor UI** for Climate, Time and standalone Pulse. Reuse one configuration model/component and the compact optional-control pattern used by VPD.
2. **Responsive/visual acceptance** for the new setup/editor surfaces.
3. **Dashboard/detail Pulse phase/progress/status** integrated into the existing requested/final output, reason, automation-fault and hard-safety language.
4. Final cross-mode regression/hardware only where remaining changes actually touch generated runtime or real-device behavior.

After Pulse V1 is stable, resume Dashboard status polish, UX redesign round 2, watchdog/stabilization and v1 feature freeze from `docs/ROADMAP.md`.

## Safety and execution rules

- Pulse never becomes a second relay owner.
- Forced OFF, hard safety and OFF-requiring automation faults cancel Pulse immediately.
- Parent inactive/window close cancels immediately rather than finishing a cycle.
- MANUAL cancels/suspends Pulse; returning to AUTO starts a fresh configured cycle when the parent is active.
- Standalone restart begins safe OFF; never resume an unknown in-flight timer.
- React may display phase/progress but never owns Pulse timers.
- Use direct GitHub for repo audit/changes and Local Agent for Mac/local commands, builds, tests, Playwright and hardware.
- Any relay-mutating real-device test must end with explicit relay OFF and verification.
- Run focused checks while iterating and one final full `pnpm check` on the exact completion HEAD. Use `pnpm check:full` when responsive E2E is part of acceptance.
