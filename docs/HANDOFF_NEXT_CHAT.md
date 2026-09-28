# Handoff — golden checkpoint after Plug navigation stabilization

Status: **2026-09-28 — golden checkpoint; runtime, Plug surfaces and navigation audited; no active implementation slice**

Repository: `MichalMatu/shelly-link`

## Current checkpoint

Shelly Link remains climate/grow-first and local-first: the phone configures, manages and diagnoses; Shelly executes installed automation locally.

Accepted state:

- one canonical physical Plug registry keyed by normalized `Shelly.GetDeviceInfo.id`; BLE and HTTP addresses are locators, not identity;
- local `climate-engine-v1` with safe boot OFF, AUTO stale-data OFF and 1–4 BLE thermometers;
- Climate user control modes are only `AUTO` and `MANUAL`;
- entering MANUAL always starts safe OFF; explicit relay ON/OFF is allowed only in MANUAL; return to AUTO is explicit and starts safe OFF;
- automation sensor/runtime faults are tracked separately from control mode; in AUTO they force safe OFF, while MANUAL remains explicit user control;
- hard safety lockout is a separate higher-priority axis that forces OFF in AUTO and MANUAL and requires deliberate recovery;
- diagnostics expose control mode, manual request, automation-requested relay state, automation fault, safety lockout, final relay state, reason, last relay-change uptime and last control-mode transition uptime;
- managed Climate control changes state through `Script.Eval`, not raw relay RPC from presentation;
- temporary BLE discovery preserves/restores Climate runtime control state around its short-lived script lifecycle and falls back safe OFF if restoration fails;
- install/update converges Plug S Gen3 button mode to `detached`; uninstall restores the pre-install mode after safe script removal;
- Time automation remains native Shelly Schedule ownership. Its `paused` state is a schedule state, not a Climate control mode;
- BLE-only Plug dashboard reachability remains visibly offline across background refresh attempts; relay controls stay disabled while reachability is unknown/offline and the offline state clears only after a successful runtime read;
- Plug Detail starts directly with the five tabs `Automation | BLE | Device | Script | Info`; the separate identity summary card was removed. Identity/model/transport detail belongs in `Info`.
- a saved Plug without automation still opens the same Plug Detail; **Automation** is selected by default and shows a no-automation empty state with a Plug-scoped **Add automation** CTA;
- top-level `← Plugs` / `AppPageBack` duplication is removed where bottom navigation or platform/browser Back already owns return navigation; page-local Back remains only for true nested subflows.

## Re-audit results

The post-change audit confirmed:

- active Climate code no longer carries `manual-off`, `manual-on`, user-facing Climate `PAUSED`, `pauseInstalledAutomation`, `resumeInstalledAutomation` or `PlugDetailIdentity`;
- remaining `paused` references belong to native Time Schedule state or tests asserting that Climate has no PAUSED control;
- managed Climate relay mutation still has one runtime owner; mobile mode/manual commands go through the typed `Script.Eval` protocol;
- sensor loss is an automation fault: AUTO fails OFF, while MANUAL retains explicit user ON/OFF authority;
- hard safety remains independent and higher priority than AUTO/MANUAL;
- multi-sensor freshness is per member; stale members are ignored and AUTO faults only when no configured member can produce a usable aggregate;
- BLE discovery state preservation, config-update safety and reboot/recovery semantics remain covered by the runtime tests;
- plain Plug card-surface navigation opens Detail without stealing relay/name/menu/CTA interactions;
- `AppPageBack` remains only in true nested contexts such as Plug BLE discovery and inner hardware-setup steps.

## Plug S Gen3 physical-button capability

Real-device characterization on Plug S Gen3 firmware 1.7.5 established that `detached` prevents direct relay toggling but exposes no usable local Input/Button event for the built-in button.

Therefore manual takeover on Plug S Gen3 remains app-driven. Do not reintroduce a simulated `input:0` contract or switch the button back to `momentary` while Climate owns the relay.

The ownership decision is correct; the current locked Button Mode presentation is only a UX concern. If that screen is polished later, prefer a clear read-only managed-state explanation instead of a disabled dropdown/save pair. Do **not** unlock the physical relay control while Climate owns the relay.

Detailed real-device evidence belongs in `docs/testing/hardware-matrix.md`.

## Verification checkpoint

Golden product commit `738fb0b48dd839dfb8a9c86cc862d5ebb35b336e` passed:

- full `pnpm check`;
- responsive Playwright: `36/36`;
- focused Plug settings/navigation browser coverage;
- clean Android `phone-alpha` uninstall/install/cold-start on Samsung SM-S906B, Android 16, app `2.0.10` / versionCode `20010`.

The user preliminarily accepted the resulting phone UI. This final navigation acceptance did not deliberately mutate relay state, managed runtime or schedules.

Remote branch hygiene at this checkpoint is intentionally minimal: `main`, `agent-control` and parked `work/kvs-datalogger`.

## Next work

No implementation task is assumed by this handoff checkpoint.

The next **major roadmap slice** remains History / Datalogger. `work/kvs-datalogger` is parked source material only; do not mechanically merge or rebase it. Reconcile it with current exclusive Climate script ownership and the AUTO/MANUAL + fault/safety model first.

History should explain why the relay changed. At minimum preserve:

- timestamp;
- temperature, humidity and VPD;
- automation-requested and final relay state;
- control mode;
- manual request;
- reason/trigger code;
- automation-fault and hard-safety context;
- useful power/current data when available.

History failure must never compromise Climate safety or relay control.

A smaller known UX follow-up also remains available if selected explicitly: replace the managed Climate Button Mode disabled form with a read-only explanation while preserving the `detached` ownership rule.

## Contracts to preserve

- one managed automation owner per Plug relay;
- one final Climate relay-decision owner;
- AUTO sensor loss fails OFF;
- MANUAL starts OFF but retains explicit user ON/OFF even if automation sensor data is stale/unavailable;
- hard safety lockout overrides both AUTO and MANUAL;
- identity verification before destructive/runtime mutation;
- passive recovery does not silently rewrite a valid runtime;
- UI presents state; flows own RPC side effects and lifecycle;
- BLE dashboard offline state must not flicker with background polling;
- Plug Detail has tabs first and no duplicate identity summary card;
- a saved Plug remains navigable without automation; **Automation** shows the explicit empty state and Plug-scoped Add automation CTA;
- top-level screens do not duplicate Plugs return navigation with `AppPageBack`; reserve page-local Back for true nested subflows;
- `packages/*` never import `apps/*`;
- no compatibility shims for unreleased development states unless they are deliberate migrations;
- hardware-facing acceptance records the final relay state;
- preserve `work/kvs-datalogger` until the History slice explicitly consumes it.

Before continuing, read this file, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, relevant `AGENTS.md` files and verify current `main` plus the fresh Local Agent daemon state.
