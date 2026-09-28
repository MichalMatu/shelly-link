# Handoff — Plug UI unification and UX audit

Status: **2026-09-28 — UX unification branch is stable; Local Agent idle; continue from verified repo state**

Repository: `MichalMatu/shelly-link`

## Bootstrap

Do not assume state from this document alone. At the start of a new chat:

1. verify remote `main` and `refactor/plug-ui-unification`;
2. verify Local Agent daemon/binding and any active task;
3. read root/relevant `AGENTS.md`;
4. read this file, `docs/UX_VISUAL_CONTRACT.md`, `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`;
5. only then choose the next implementation slice.

Local Agent bindings are conversation-scoped runtime state and must never be copied from this handoff.

## Repository state at handoff

- `main`: `823b51ef0d58ff731d8d25df8d54db968d97cea5` — golden Plug navigation checkpoint.
- UX work branch: `refactor/plug-ui-unification`.
- Product implementation commit before the docs-only handoff commits: `93d36b54983dd2ab7e825b213ee0124ff4aee512` — `Add Thermometer detail settings`.
- Frozen Climate recovery branch: `golden/climate-ui-20260928` at `823b51ef0d58ff731d8d25df8d54db968d97cea5`.
- Local Agent was idle after the completed Thermometer slice.

Because this file and `UX_VISUAL_CONTRACT.md` are updated as docs-only commits after the product commit above, verify the actual branch HEAD instead of hard-coding the handoff SHA.

## Non-negotiable UX target

The accepted Climate/humidity Plug dashboard card and Plug detail tabs are the **golden master**. They took substantial iteration and must not drift during refactors.

Do not build a second similar design for Time, Thermometers or another device. Reuse the same components/tokens/geometry where the role is the same. Product-specific content may differ; the shell and interaction pattern should not.

`pnpm quality:ux` protects the frozen Climate baselines. Do not refresh those snapshots as part of unrelated work.

## Completed on `refactor/plug-ui-unification`

### Plug dashboard / Time automation

- Climate was frozen first and kept visually unchanged while shared Plug UI was modularized.
- Time no longer uses the old `Working` / `Daily schedule` / bottom `Details` presentation.
- Time uses the shared Plug dashboard language:
  - Plug identity/header and `⋮` detail affordance;
  - AUTO / MANUAL;
  - ON / OFF in MANUAL;
  - Plug telemetry;
  - Time-specific schedule content only where automation content actually differs.
- Time AUTO/MANUAL is real runtime behavior: AUTO owns native Shelly Schedule; MANUAL pauses schedule control and permits explicit relay ON/OFF.

### Plug detail

- Time uses the canonical Plug detail structure rather than the old parallel detail page.
- Time exposes shared `Automation / Bluetooth / Device / Info` capabilities; native Schedule does not invent a Script tab.
- Device settings reuse the shared Plug surfaces.
- Time Info has the same saved-Plug forget behavior as Climate; forgetting the saved Plug does not uninstall durable automation ownership.
- Managed Climate Button Mode is now a read-only managed-state explanation instead of a disabled select/save form.

### Shared UI / add flows

- Add Plug and Add Thermometer use the shared `@lcl/ui` `SegmentedControl` instead of copied tablist JSX.
- Add Plug keeps IP range editing behind the compact `Zakres skanowania` disclosure; the current range remains visible while collapsed.
- Discovery cards were audited but deliberately **not** abstracted into a mega-component; their interaction models differ enough that forced abstraction would add variants without improving ownership.

### Thermometers

- Thermometer dashboard cards were simplified to prioritize identity, live temperature/humidity and compact telemetry.
- Permanent technical/edit/delete/PVVX action clutter was moved to nested Thermometer settings.
- Nested Thermometer settings are routed through the existing hardware setup ownership rather than duplicating BLE/PVVX orchestration.
- Thermometer presentation lives under `features/thermometers`; saved-card/list presentation was extracted to satisfy feature and module boundaries.
- Canonical visual coverage includes the updated Thermometers dashboard and the nested Thermometer detail/settings state.

## Verification of latest product commit

The latest product commit is `ec813098cad17c3cf01225706b8e996ef251c705` (`Inline Time detail schedule editing`). It incorporates the user's real-device review of Time Detail without changing the Climate golden master.

Acceptance evidence:

- Time Detail now uses the clock icon in the shared Plug tabs;
- duplicate detail-level AUTO/MANUAL and relay ON/OFF controls were removed; those remain on the dashboard card;
- ON/OFF schedule times are edited inline using the existing Time schedule picker, with `Save changes` directly on the detail surface;
- the separate `Edit` step was removed;
- Save and Delete are serialized so a destructive delete cannot race an in-flight Schedule update;
- focused Time detail tests: **12/12**;
- typecheck/mobile build passed;
- `quality:ux`, repository gate, feature-boundary gate and quality self-test passed;
- full responsive Playwright: **36/36**;
- canonical visual verification: **4/4**; only the intentional `11-time-detail-darwin.png` baseline changed;
- pre-push reran the full mobile suite: **396/396** and completed successfully.

Samsung SM-S906B / Android 16 then installed exact product commit `ec813098cad17c3cf01225706b8e996ef251c705` with `adb install -r`, preserving app data and the user's existing 08:00/20:00 Time schedule. Read-only inspection confirmed the Time Detail surface contains Output, Shelly clock, inline `Turn ON at` / `Turn OFF at`, `Save changes`, and delete, with no duplicate AUTO/MANUAL, relay ON/OFF, or Edit action. No schedule or relay mutation was performed during this verification. The branch is again ready for deliberate merge/closeout.

## Visual contract

Read `docs/UX_VISUAL_CONTRACT.md` for the durable rules. Important points:

- canonical screenshots use macOS at `412×915`;
- `apps/mobile/e2e/visual-contract.ts` is the source of truth for current baseline names;
- Climate golden states are immutable unless the user explicitly changes the target design;
- snapshot refresh is never a substitute for explaining a visual delta;
- shared roles reuse shared components/classes instead of parallel JSX/CSS.

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
- identity must be verified before destructive/runtime mutation;
- `packages/*` never import `apps/*`;
- new cohesive product capabilities belong under `features/<feature>` rather than regrowing legacy screen/flow god objects.

## What remains

The broad UX audit is mostly past the original Time problem. Do **not** reopen already-fixed areas without screenshot/user evidence.

Good next choices are:

1. close out/merge `refactor/plug-ui-unification` deliberately;
2. do not reopen the completed UX slices without new screenshot/user evidence;
3. after merge, the next major roadmap slice is History / Datalogger. `work/kvs-datalogger` is parked source material and must be reconciled with current exclusive Climate ownership rather than mechanically merged.

Avoid starting History while the user is still reviewing this UX branch.

## Testing workflow

For each implementation slice:

- verify fresh branch + daemon first;
- make the smallest cohesive change;
- run focused tests/type/quality during iteration;
- use screenshots for geometry changes;
- run exactly one final full repository gate before push;
- do not weaken quality gates or raise hotspot budgets merely to land a refactor.

The current UX work deliberately used repository/feature-boundary failures to extract real component boundaries instead of adding exceptions.
