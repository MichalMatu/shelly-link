# Handoff — Stage 9 stabilization in progress

Status: **2026-10-04 — Stage 9 soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, and controlled real-device `Shelly.Reboot` recovery are qualified on `main`. Draft PR #89 BLE scanner watchdog recovery has now passed its exact-candidate real-hardware sensor-silence/stale/recovery gate and is ready for final CI/diff review and merge. Physical mains power-cycle, remaining Wi-Fi/BLE loss/recovery, long soak and final hardware closeout remain.**

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

## Recent merge closeout

The current stabilization baseline on `main` includes:

- PR #84 — generalized temporary BLE discovery runtime restoration;
- PR #85 — soak liveness/stabilization reporting;
- PR #86 — deterministic runtime recovery interaction matrix;
- PR #88 — controlled real-device `Shelly.Reboot` recovery evidence.

Safe inline Standalone Pulse replacement from PR #83 remains part of the accepted baseline. The earlier PR #81 UX hierarchy closeout remains authoritative for accepted Plug/Thermometer navigation and visual hierarchy; do not reopen that generic UX-polish round without a concrete regression or accepted product change.

## Active unmerged work

Draft PR #89 `Fix BLE scanner watchdog recovery after sensor loss` is **not part of `main` yet**. Its candidate branch is `fix/scanner-watchdog-sensor-loss-20261004`.

The candidate changes the Climate runtime scanner watchdog so prolonged sensor silence alone does not restart a healthy scanner. Scanner recovery instead checks scanner liveness and starts the scanner only when it is actually stopped. The exact product candidate `d291a42d175972d01836f2fdf0cb9d88e91792c0` passed the real Plug S Gen3 hardware gate with deployed runtime SHA-256 `46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef`: 145 s of accepted-target-frame silence crossed the legacy 90 s restart threshold and the configured 120 s stale timeout while `BLE.Scanner.isRunning()` stayed true, `R.sa` and `R.l` remained unchanged, stale forced the physical relay OFF, and restoring the configured sensor address produced fresh BLE data and automatic AUTO recovery. The post-gate merge from current `main` changed documentation only; all four PR implementation/test files remained byte-identical to the tested product candidate. The PR is ready for final CI/diff review and merge.

Do not replace that candidate with the abandoned `fix/scanner-restart-delay-20261004` alternative; that branch is superseded by PR #89.

## Current product / UX contract

Pulse V1 remains closed and uses one shared Pulse-cycle engine. Do not create separate Temperature/Humidity/Time/standalone Pulse engines.

Current top-level navigation is `Plugs | Thermometers | Settings`.

Accepted UX state:

- top-level Add Plug and Add Thermometer have no page-local Back;
- setup starts from a physical Plug;
- Time is Plug automation;
- standalone Pulse dashboard is the only place for AUTO/MANUAL and manual relay ON/OFF;
- standalone Pulse Plug Detail is read-only for runtime control and owns status, inline cycle configuration and safe uninstall;
- Time and standalone Pulse dashboards are status-first;
- Time Detail and standalone Pulse Detail use current state → configuration → destructive action hierarchy;
- Thermometer dashboard cards focus on identity/live readings; rename, PVVX/device actions, technical identity and deletion live in nested Thermometer Settings;
- Thermometer removal blocked by Climate ownership keeps a direct route to the owning automation;
- Plug Detail is capability-driven; BLE-only Plug Detail exposes Device + Info only;
- setup navigation reuses `@lcl/ui` `SegmentedControl`;
- Plug dashboard feedback is owned by the shared Plug feedback primitive rather than parallel card-specific markup;
- Climate detail/dashboard composition remains the frozen golden master unless an explicit product decision changes it.

Temporary Plug BLE discovery no longer depends on a Climate-only restore payload. The lifecycle carries one opaque managed-automation restore state and supports the existing Climate control-state protocol plus Standalone Pulse AUTO/MANUAL preservation. Pulse AUTO is restored by restarting the existing script into a fresh cycle; Pulse MANUAL keeps the script stopped and restores the verified relay state. An unknown running script fails closed before the discovery lifecycle mutates it. Restore failure leaves the managed relay OFF and stops the managed script best-effort.

The standalone Pulse Bluetooth detail remains intentionally read-only in this slice. Generalizing safe restoration removes the runtime blocker but does not itself enable active Standalone Pulse BLE scan UI.

## Qualification state

The BLE restore implementation has focused deterministic coverage for:

- unchanged Climate control-state capture/restore semantics;
- Standalone Pulse AUTO capture/restore;
- Standalone Pulse MANUAL relay-state capture/restore without starting the script;
- unknown running scripts failing before destructive discovery preparation;
- discovery preparation ordering: capture → verified OFF → stop running automation → verified OFF;
- scanner deletion before managed runtime restoration;
- restoration failure falling back to relay OFF + managed script stop;
- late/unmounted discovery cleanup carrying the opaque restore state unchanged.

Focused mobile tests, typecheck, repository quality gates and UX quality gates passed for the BLE restoration implementation, followed by its final canonical gate and merge. That restoration slice itself made no hardware claim. Current Stage 9 hardware evidence is recorded separately in the dated testing documents.

PR #89 scanner-watchdog hardware acceptance is also complete. The real-device gate used target-address isolation to create the exact no-accepted-frame condition on the physical Plug while leaving BLE/RF scanning live; it is not a claim that the sensor was physically RF-shielded. Detailed evidence: `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`.

## Runtime / safety boundaries

Keep these invariants:

- one managed automation owner per Plug relay;
- boot/stale-sensor/hard-safety forced-OFF behavior is authoritative;
- destructive/runtime mutations require physical-device identity verification where ownership is known;
- mutating RPCs are not automatically retried;
- React displays runtime state but never owns device automation timing;
- temporary BLE discovery captures managed runtime state before mutation, forces and verifies OFF before the scanner runs, and restores only recognized managed runtime kinds;
- frozen Climate composition is not collateral cleanup territory.

## Android deployment claims

Do not infer what a physical phone is running from this document. A phone claim is valid only when a fresh deployment task records the exact source SHA, authorized device, `adb install -r` result, cold start and live process. Preserve app data by default; do not substitute a clean uninstall unless explicitly required and approved.

## Next work

The application is near feature-complete. Three Stage 9 slices are qualified on `main`: soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, and a deliberate real-device software reboot. PR #89 adds a fourth qualified hardware result and is pending merge: healthy-scanner sensor silence -> stale/OFF -> fresh-BLE AUTO recovery. The configured Plug recorded boot-safe OFF at uptime 4 s during the separate software-reboot gate, restarted the same byte-identical managed Climate source, retained empty schedules and recovered AUTO only after fresh BLE input. This is not a physical mains power-cycle claim.

Default order is now:

1. finish final CI/diff review for hardware-qualified PR #89 and merge it without changing the tested executable candidate;
2. qualify physical mains power-cycle plus remaining Wi-Fi/BLE loss/recovery;
3. run a materially longer soak and close the final real-hardware matrix;
4. declare V1 feature freeze and run release qualification.

Detailed recovery evidence already on `main`: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md` and `docs/testing/reboot-recovery-acceptance-2026-10-04.md`. PR #89 hardware evidence is in `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`.

Enabling active Standalone Pulse BLE scan is now technically unblocked, but remains a separate explicit product/UX slice rather than being smuggled into restoration plumbing.

Do not add another generic UX-polish round or expand Pulse with unrelated runtime modes unless a concrete defect or accepted product change requires it.

## Verification reminders

- use focused checks while iterating and one final canonical gate on the exact completion head;
- use responsive/canonical visual acceptance when a slice changes those surfaces;
- use `pnpm release:qualify` for software release evidence;
- use `pnpm release:qualify:hardware` only when real hardware acceptance is actually being claimed.
