# Handoff — UX polish merged; stabilization is next

Status: **2026-10-03 — PR #81 is merged to `main`. The current UX polish round is closed and qualified; do not reopen it without a concrete regression or accepted product change.**

Repository: `MichalMatu/shelly-link`

## Source of truth

Do not reconstruct state from chat memory. Start from fresh repository state and Local Agent state.

Read in this order:

1. `AGENTS.md`;
2. this file;
3. `docs/ARCHITECTURE.md`;
4. `docs/ROADMAP.md`;
5. `docs/UX_VISUAL_CONTRACT.md`;
6. `docs/testing/hardware-matrix.md`;
7. dated Pulse/runtime acceptance records only when changing already-qualified runtime behavior.

Then fetch fresh `main` and `agent-control:.agent/status/daemon.json`. Verify there is no active or duplicate Local Agent task before changing anything.

## Latest merge closeout

PR #81 `Polish Plug and Thermometer UX hierarchy` is merged:

- qualified head: `a63fd85b0f195db8be2d7ec75e71a7084ca4b6f5`;
- merge commit: `285e477014087c723ed2392601d3f44396179910`;
- GitHub CI run `37153822424`: PASS;
- all seven Codex review threads were addressed and resolved before merge.

The final review closeout added deterministic UX-gate self-tests, preserved the direct route from blocked Thermometer removal to its owning automation, kept typed BLE error messages actionable, kept the settings page private to its feature route, moved durable UX evidence into canonical docs, reconciled the Thermometer removal contract and made removal success feedback survive navigation.

## Current product / UX contract

Pulse V1 remains closed and uses one shared Pulse-cycle engine. Do not create separate Temperature/Humidity/Time/standalone Pulse engines.

Current top-level navigation is `Plugs | Thermometers | Settings`.

Accepted UX state:

- top-level Add Plug and Add Thermometer have no page-local Back;
- setup starts from a physical Plug;
- Time is Plug automation;
- standalone Pulse dashboard is the only place for AUTO/MANUAL and manual relay ON/OFF;
- standalone Pulse Plug Detail is read-only for runtime control and owns status/configuration/safe uninstall;
- Time and standalone Pulse dashboards are status-first;
- Time Detail and standalone Pulse Detail use current state → configuration → destructive action hierarchy;
- Thermometer dashboard cards focus on identity/live readings; rename, PVVX/device actions, technical identity and deletion live in nested Thermometer Settings;
- Thermometer removal blocked by Climate ownership keeps a direct route to the owning automation;
- Plug Detail is capability-driven; BLE-only Plug Detail exposes Device + Info only;
- setup navigation reuses `@lcl/ui` `SegmentedControl`;
- Plug dashboard feedback is owned by the shared Plug feedback primitive rather than parallel card-specific markup;
- Climate detail/dashboard composition remains the frozen golden master unless an explicit product decision changes it.

The standalone Pulse Bluetooth detail remains intentionally read-only. Temporary BLE discovery restoration is still Climate-specific and must be generalized before active standalone Pulse BLE scan/restore is enabled.

Safe inline editing/replacement of an installed standalone Pulse cycle remains deliberately deferred. The current generic install path is destructive; editing needs an explicit backup/replacement/rollback lifecycle and requalification.

## UX qualification

Exact PR #81 head `a63fd85b0f195db8be2d7ec75e71a7084ca4b6f5` passed:

- format, lint, `quality:ux`, `quality:repo`, typecheck;
- `quality:selftest`: 19 deterministic gate cases, including positive/negative setup-navigation coverage;
- non-mobile workspace tests;
- mobile Vitest: 109/109 files, 498/498 tests with `--maxWorkers=2` on the 8 GB Mac host;
- Product Matrix, core coverage, build and performance budget;
- responsive Playwright: 50/50;
- canonical visual contract: 7/7;
- final canonical PNG delta: none;
- real Android AVD/WebView inspection at 412 CSS px confirmed no horizontal overflow for Thermometer dashboard/settings.

The two-worker mobile run is a host-load constraint, not a weakened product gate. Test expectations and repository timeouts were not relaxed.

Durable visual/UX acceptance belongs in `docs/UX_VISUAL_CONTRACT.md`. Do not create another branch-specific UX checkpoint document.

## Runtime / safety boundaries

PR #81 changes product presentation and management flow; it does not reopen generated Climate/Time/Pulse runtime semantics. Existing dated real-Shelly runtime acceptance remains authoritative.

Keep these invariants:

- one managed automation owner per Plug relay;
- boot/stale-sensor/hard-safety forced-OFF behavior is authoritative;
- destructive/runtime mutations require physical-device identity verification;
- mutating RPCs are not automatically retried;
- React displays runtime state but never owns device automation timing;
- frozen Climate composition is not collateral cleanup territory.

## Android deployment claims

Do not infer what a physical phone is running from this document. A phone claim is valid only when a fresh deployment task records the exact source SHA, authorized device, `adb install -r` result, cold start and live process. Preserve app data by default; do not substitute a clean uninstall unless explicitly required and approved.

## Next work

The application is near feature-complete. Default order is now:

1. safe standalone Pulse inline edit/replacement lifecycle as a separately qualified slice;
2. generalize temporary BLE discovery restoration before active standalone Pulse BLE scan;
3. watchdog/recovery/soak stabilization and final real-hardware matrix;
4. V1 feature freeze and release qualification.

Do not add another generic UX-polish round or expand Pulse with unrelated runtime modes unless a concrete defect or accepted product change requires it.

## Verification reminders

- use focused checks while iterating and one final canonical gate on the exact completion head;
- use responsive/canonical visual acceptance when a slice changes those surfaces;
- use `pnpm release:qualify` for software release evidence;
- use `pnpm release:qualify:hardware` only when real hardware acceptance is actually being claimed.
