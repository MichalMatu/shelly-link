# Handoff — clean main after UX unification

Status: **2026-09-28 — Plug/Time/Thermometer UX unification is merged and closed; start new work from `main`.**

Repository: `MichalMatu/shelly-link`

## Bootstrap

Do not assume state from this document alone. At the start of a new chat:

1. verify remote `main`;
2. verify the Local Agent daemon, fresh conversation binding and any active task;
3. inspect remote branches before creating or deleting anything;
4. read root/relevant `AGENTS.md`;
5. read this file, `docs/UX_VISUAL_CONTRACT.md`, `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`;
6. only then create a fresh work branch for the next slice.

Local Agent bindings are conversation-scoped runtime state and must never be copied from this handoff.

## Repository state at closeout

- UX PR: **#38 — Unify Plug, Time, and Thermometer UX**.
- Product merge commit on `main`: `9196cac9d32ac3ade694f31c04ebfe1d2d424fb9`.
- Final pre-merge UX branch head: `7220c8f2f8116d84d4a8796eca033464a05ea141`.
- `refactor/plug-ui-unification` is finished and should not be reused after branch cleanup.
- Frozen Climate recovery branch intentionally remains: `golden/climate-ui-20260928` at `823b51ef0d58ff731d8d25df8d54db968d97cea5`.
- `work/kvs-datalogger` intentionally remains parked source material for the History/Datalogger slice; do not mechanically merge or rebase it into current `main`.
- `agent-control` remains the Local Agent control branch; it is not a product work branch.

Always verify actual refs before acting because docs-only closeout commits may move `main` beyond the product merge SHA above.

## Frozen UX contract

The accepted Climate/humidity Plug dashboard card and Plug detail tabs remain the **golden master**.

Do not create parallel Time-, Thermometer- or device-specific designs when the role is already shared. Reuse the same components, tokens and geometry. Product-specific content may differ; the shell and interaction role should not.

`pnpm quality:ux` protects the frozen Climate baselines. Do not refresh Climate golden snapshots as part of unrelated work and do not weaken quality gates or raise hotspot budgets to land a refactor.

## Completed UX unification

### Time / Plug dashboard

- Time uses the shared Plug card structure rather than the retired `Working` / `Daily schedule` / separate `Details` pattern.
- AUTO/MANUAL is real runtime behavior over native Shelly Schedule ownership.
- MANUAL exposes explicit relay ON/OFF on the dashboard only.
- Plug telemetry and detail affordances reuse the shared Plug surfaces.

### Time detail

- Time uses the shared capability-driven Plug detail shell with `Automation / Bluetooth / Device / Info`; native Schedule does not invent a Script tab.
- The Automation tab uses the Time-specific **clock** icon.
- Duplicate detail-level AUTO/MANUAL and relay ON/OFF controls are removed.
- `Turn ON at` / `Turn OFF at` are edited inline and saved directly with `Save changes`.
- The old nested `Edit` route was removed in final cleanup instead of being left as dead navigation scaffolding.
- Save/Delete are serialized so destructive deletion cannot race an in-flight Schedule update.

### Thermometers / shared UI

- Thermometer dashboard cards prioritize identity and live readings.
- Rename, PVVX time sync, delete and technical identity live in nested Thermometer settings.
- Thermometer presentation ownership lives under `features/thermometers`.
- Add Plug and Add Thermometer use shared `@lcl/ui` segmented navigation.
- Add Plug keeps technical scan-range editing under the compact disclosure.
- Managed Climate Button Mode remains read-only while Climate owns the relay.

## Final verification

Final closeout head `7220c8f2f8116d84d4a8796eca033464a05ea141` passed:

- `pnpm check`;
- mobile tests: **84/84 files, 394/394 tests**;
- responsive Playwright: **36/36**;
- canonical visual contract: **4/4**;
- `quality:ux`, repository gate, feature-boundary gate and quality self-test;
- clean worktree before merge.

The final audit also removed the retired automation edit route and related test/navigation scaffolding (about 200 deleted lines). Two long hardware-setup UI tests received explicit per-test timeout headroom after repeated host-load-only 5 s timeouts; no repository gate, coverage requirement or product invariant was weakened.

Real-device acceptance is recorded in `docs/testing/hardware-matrix.md`. Most recently, Samsung SM-S906B / Android 16 accepted the Time Detail correction at product commit `ec813098cad17c3cf01225706b8e996ef251c705`, preserving app data and the existing 08:00/20:00 native Schedule. The screen showed the clock icon, inline ON/OFF time editing and Save/Delete without duplicate AUTO/MANUAL, relay controls or nested Edit. Earlier closeout also verified the Thermometer dashboard/settings and real Time Schedule lifecycle on the physical device.

## Architecture contracts to preserve

- phone configures/manages/diagnoses; Shelly executes automation locally;
- one managed automation owner per Plug relay;
- Climate user modes are only AUTO/MANUAL;
- entering MANUAL is safe OFF; relay ON/OFF is explicit and manual-only;
- returning to AUTO is explicit and safe OFF;
- stale Climate sensor data fails OFF in AUTO; MANUAL remains explicit user control;
- hard safety lockout overrides AUTO and MANUAL;
- managed Climate state changes through the script/runtime owner, not raw relay RPC from presentation;
- Time remains native Shelly Schedule ownership;
- UI presents state; flows own side effects/RPC/lifecycle;
- identity is verified before destructive/runtime mutation;
- `packages/*` never import `apps/*`;
- new cohesive product capabilities belong under `features/<feature>` rather than regrowing screen/flow god objects.

## Next slice

The next planned major slice is **History / Datalogger**.

Start it from fresh `main`, not from the closed UX branch. Treat `work/kvs-datalogger` only as source material: audit it against current exclusive Climate ownership, runtime arbitration, identity gates and current architecture before deciding what to reuse. Do not mechanically merge the parked branch.

Suggested first task for a new chat: perform a preimplementation audit of the current History/Datalogger requirements and the parked `work/kvs-datalogger` diff against fresh `main`, with **no behavior change**, then propose the smallest implementation plan.

## Working rule

For each new slice: verify fresh refs + daemon first, branch from current `main`, make the smallest cohesive change, use focused tests during iteration, use screenshots for geometry changes, and run one final full repository gate before merge. Hardware-facing changes require real-device evidence and an explicit final relay state whenever relay mutation is exercised.
