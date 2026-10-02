# Handoff — Dashboard status polish slice accepted after Pulse V1

Status: **2026-10-02 — Pulse V1, Dashboard status polish slice 1, and the Time + Pulse boot-time clock-recovery fix are accepted on the PR #76 merge line. The clock-recovery code candidate is `66ac5f75df986fe638e7c49de32f4989df92e314`; frozen Climate golden UI remains unchanged.**

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
8. `docs/testing/pulse-v1-operational-status-read-path-audit-2026-10-02.md`;
9. `docs/testing/pulse-v1-operational-status-acceptance-2026-10-02.md`;
10. `docs/testing/time-pulse-clock-recovery-acceptance-2026-10-02.md`;
11. `docs/UX_VISUAL_CONTRACT.md`.

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
- Shared Pulse UI branch: `pulse-v1-shared-ui`;
- accepted shared setup/editor + responsive visual acceptance: `99ae14745215e5d267ed2588806a1bc0d05c6420`;
- durable shared-UI closeout baseline before the operational-status audit: `cd0a335e65ff1c0f0a58340704e7192bdee458c6`;
- accepted operational-status implementation + responsive acceptance: `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2`.
- Dashboard status polish branch: `dashboard-status-polish`; accepted slice-1 code/acceptance head: `08a50db96f126e04dd509c246581939aabcde3d6`.
- PR #76 review clock-recovery fix: `66ac5f75df986fe638e7c49de32f4989df92e314`; fail-safe OFF now retries the Shelly clock gate every 30 s and clears only `tm` after time becomes trustworthy.

The Standalone descendants after the hardware candidate add app ownership/reconciliation integration, repository-boundary cleanup, tests and durable docs; they do not change the generated Standalone Shelly runtime. The code-only candidate passed full `pnpm check` with a clean worktree, and `@lcl/script-generator` passed **229/229 tests at 100% statements/branches/functions/lines**.

No Pulse PR/merge has been performed. Fetch fresh branch HEADs instead of assuming a documentation SHA is still current.

Durable remote branches should be limited to:

- `main`;
- `agent-control`;
- `golden/climate-ui-20260928`;
- `pulse-v1-runtime-integration`;
- `pulse-v1-time-adapter`;
- `pulse-v1-standalone-adapter`;
- `pulse-v1-shared-ui`.
- `dashboard-status-polish`.

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

### Shared Pulse setup/editor UI — closed

The accepted shared UI head is `99ae14745215e5d267ed2588806a1bc0d05c6420` on `pulse-v1-shared-ui`. Climate and Time reuse the same `PulseCycleEditor` and pulse form model through an optional `Zachowanie wyjścia` selector; standalone Pulse uses the same editor with Pulse always enabled. The standalone intent/route is wired without creating a second runtime implementation.

Responsive acceptance covers the five canonical viewports for Time, standalone Pulse and the current Plug setup flow. Canonical Darwin states are `24-climate-pulse-setup`, `25-time-pulse-setup` and `26-standalone-pulse-setup`; the intentional setup/intent deltas refreshed `08-automation-intent`, `09-time-setup` and `16-climate-setup`. Frozen Climate detail state `02-climate-automation` remains byte-for-byte protected by keeping the new Pulse editor out of the legacy inline detail form. Final pre-push canonical visual verification passed 5/5.

### Operational Pulse status — closed

Pulse operational status is one read-only normalized capability shared by Climate, Time and standalone Pulse. The mobile model carries availability, phase, completed cycles, next transition uptime, reason, automation-requested output, final relay output, automation fault, hard-safety state/reason and device uptime.

- Climate reuses the existing `/diag` read path and maps its Pulse diagnostics into the shared model.
- Time + Pulse and standalone Pulse use the smallest read-only `Script.Eval` adapter over existing runtime state (`R.ps`, `R.pc`, `R.pn`, `R.rs`, requested output and automation fault) plus device uptime; `Shelly.GetStatus` remains the authority for the final physical relay state.
- React derives remaining display time only from device-reported uptime/deadline data. React never owns or advances a Pulse timer.
- Active phase data whose device uptime has passed the reported deadline beyond the bounded grace is marked stale; malformed/missing state becomes unavailable rather than inventing a phase.
- Dashboard uses the compact shared status summary; detail uses the full summary and includes automation-fault and hard-safety rows. Climate, Time and standalone Pulse share the same presentation language.
- No generated Shelly runtime, timing semantics, restart behavior, persistence, safety precedence or lifecycle behavior changed for this status slice.

Acceptance on `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2`: focused responsive operational-status E2E passed **5/5** canonical viewports; the exact completion head passed full `pnpm check`; the complete responsive Playwright suite passed **46/46**. The dated acceptance record contains the detailed evidence.

Samsung S22+ / Android 16 preserving-data installation of the same application code also passed build/install/cold-start/layout smoke. The phone currently contains a non-Pulse Climate installation, so this smoke is explicitly **not** claimed as live Pulse operational-status hardware acceptance. No hardware requalification was required because generated runtime/device behavior did not change.

### Dashboard status polish — slice 1 accepted

Accepted code/acceptance head: `08a50db96f126e04dd509c246581939aabcde3d6` on `dashboard-status-polish`.

The mobile operational-status presentation now has one shared `requested output -> final relay -> reason` language for Pulse and Steady Time. Pulse keeps the already-qualified normalized read model and timing ownership. Steady Time derives requested output only from Shelly local time plus the existing schedule-domain helper while AUTO is running; paused/MANUAL deliberately reports no automation request. Climate detail now prefers the authoritative automation-requested output diagnostic while retaining its existing fallback.

The frozen Climate dashboard/detail visual contract remains unchanged: the Stage 7 work did not casually grow Climate card geometry, and the UX gate rejected accidental Climate golden regeneration. Only the intentional Time dashboard/detail snapshots changed. Full responsive Playwright passed **46/46** and the exact implementation line passed full `pnpm check`. See `docs/testing/dashboard-status-polish-acceptance-2026-10-02.md`.

No generated runtime, RPC path, polling cadence, lifecycle, persistence or hardware behavior changed.

### Time + Pulse boot-time clock recovery — accepted

PR #76 review found and closed one merge blocker: an unsynchronized Shelly clock at boot left Time + Pulse in permanent `tm` fault even after time later synchronized. Candidate `66ac5f75df986fe638e7c49de32f4989df92e314` preserves immediate safe OFF, schedules a bounded 30 s clock recheck, clears only the clock fault after trust returns, and never clears unrelated protection/relay faults. Script-generator regression coverage is 14/14 for the Time + Pulse runtime. Real Plug S Gen3 requalification observed physical Pulse ON/OFF plus cancellation and finished with the existing production Standalone Pulse source/state unchanged, schedules unchanged and final relay explicitly OFF. See `docs/testing/time-pulse-clock-recovery-acceptance-2026-10-02.md`.

## Next implementation order

Pulse V1 is closed. Do not reopen the qualified runtime/setup/status slices without a concrete failing test, hardware issue or accepted product change.

Continue the V1 plan in this order:

1. Continue Dashboard status polish with fault/hard-safety legibility using existing authoritative diagnostics and warning/detail surfaces, without casually changing frozen Climate card geometry.
2. UX redesign round 2 after the stable History/safety/Pulse foundation.
3. Watchdog/recovery/soak stabilization and the final hardware matrix.
4. V1 feature freeze.
5. Review/PR/merge the Pulse working line deliberately; `main` remains untouched until that explicit step.

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
