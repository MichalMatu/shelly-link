# Handoff — Stage 9 stabilization in progress

Status: **2026-10-04 — Stage 9 soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, and controlled real-device `Shelly.Reboot` recovery are qualified. Physical mains power-cycle plus Wi-Fi/BLE loss/recovery remain before the long-soak/final-hardware closeout.**

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

PR #83 `Add safe inline Standalone Pulse replacement` is merged:

- qualified head: `a740386e4e131fc326e428a7164aa73488cc411d`;
- merge commit: `d05ab56036b97874fa07cd73b18779844c8b1fb7`;
- GitHub CI run `37175270558`: PASS.

The slice added guarded in-place script replacement with exact source/runtime backup, expected-hash drift rejection before mutation, verified relay OFF, rollback on replacement failure and inline Standalone Pulse cycle editing that persists only after successful verification. Existing installation ID, script ID and `installedAtMs` are preserved.

The earlier PR #81 UX hierarchy closeout remains authoritative for the accepted Plug/Thermometer navigation and visual hierarchy; do not reopen that generic UX-polish round without a concrete regression or accepted product change.

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

The application is near feature-complete. Three Stage 9 slices are now qualified: soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, and a deliberate real-device software reboot. The configured Plug recorded boot-safe OFF at uptime 4 s, restarted the same byte-identical managed Climate source, retained empty schedules and recovered AUTO only after fresh BLE input. This is not a physical mains power-cycle claim. Default order is now:

1. physical mains power-cycle plus Wi-Fi/BLE loss/recovery;
2. a materially longer soak and the final real-hardware matrix;
3. V1 feature freeze and release qualification.

Detailed recovery evidence: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md` and `docs/testing/reboot-recovery-acceptance-2026-10-04.md`.

Enabling active Standalone Pulse BLE scan is now technically unblocked, but remains a separate explicit product/UX slice rather than being smuggled into restoration plumbing.

Do not add another generic UX-polish round or expand Pulse with unrelated runtime modes unless a concrete defect or accepted product change requires it.

## Verification reminders

- use focused checks while iterating and one final canonical gate on the exact completion head;
- use responsive/canonical visual acceptance when a slice changes those surfaces;
- use `pnpm release:qualify` for software release evidence;
- use `pnpm release:qualify:hardware` only when real hardware acceptance is actually being claimed.
