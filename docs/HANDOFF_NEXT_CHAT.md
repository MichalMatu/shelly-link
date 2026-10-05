# Handoff — Stage 9 stabilization in progress

Status: **2026-10-05 — PR #89 BLE scanner watchdog recovery is merged and hardware-qualified on `main`; PR #90 build/test orchestration is also merged after current-head static/tests/build/responsive/aggregate CI passed. Draft PR #91 is a hardware-blocked BLE scanner re-subscription hypothesis, not an accepted fix. Physical mains power-cycle, remaining Wi-Fi/BLE loss/recovery, long soak and final hardware closeout remain.**

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
- PR #88 — controlled real-device `Shelly.Reboot` recovery evidence;
- PR #89 — hardware-qualified BLE scanner watchdog recovery after sensor loss;
- PR #90 — tooling-only build/test orchestration split with canonical `pnpm check` scope preserved.

Safe inline Standalone Pulse replacement from PR #83 remains part of the accepted baseline. The earlier PR #81 UX hierarchy closeout remains authoritative for accepted Plug/Thermometer navigation and visual hierarchy; do not reopen that generic UX-polish round without a concrete regression or accepted product change.

PR #90 does not change product/runtime semantics. It splits the existing canonical repository gate into static/tests/build sub-gates, keeps the same `pnpm check` coverage, adds focused `pnpm check:mobile`, shortens pre-push to fast UX/repository policy gates and runs CI static/tests/build/responsive jobs in parallel behind one aggregate `checks` result. Worker concurrency/cache policy remains unchanged.

## Active unmerged work

Draft PR #91 `Fix BLE scanner re-subscription after restart` uses branch `fix/scanner-resubscribe-after-stop-20261004`, candidate `7b8b317c3cffc86695cfb1276ba8a2ea63f9d3ea`.

PR #91 changes the Climate watchdog so an actually stopped scanner receives a fresh `BLE.Scanner.subscribe(...)` before `BLE.Scanner.start()`. Its repository CI is green, but this is **not yet a proven firmware fix**. The deterministic test currently models the suspected failure by making mock `BLE.Scanner.stop()` clear the scan callback. Shelly's documented scanner contract does not state that `stop()` clears the subscription, so the mock assumption cannot be treated as device evidence.

Before PR #91 may merge, reproduce the stop/restart path on unmodified current `main` using the same physical Plug, firmware and Climate configuration. Stop the scanner through the existing `Script.Eval` path, verify scanner liveness becomes false, let the watchdog restart it, then verify whether configured target frames and `/diag` data resume without another subscription. Repeat the stop/restart cycle at least twice. If `main` resumes frames normally, close PR #91 as unnecessary. Only if `main` restarts scanning but loses event delivery should the identical sequence be repeated on the exact PR #91 candidate; that candidate must uniquely restore fresh data/AUTO recovery without weakening PR #89 stale/fail-safe behavior.

Do not merge PR #91 from deterministic tests or CI alone.

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

PR #89 scanner-watchdog hardware acceptance is complete and merged. The real-device gate used target-address isolation to create the exact no-accepted-frame condition on the physical Plug while leaving BLE/RF scanning live; it is not a claim that the sensor was physically RF-shielded. Detailed evidence: `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`.

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

The application is near feature-complete. Four Stage 9 runtime/recovery slices are qualified on `main`: soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, deliberate real-device software reboot recovery, and healthy-scanner sensor silence -> stale/OFF -> fresh-BLE AUTO recovery from PR #89. The configured Plug recorded boot-safe OFF at uptime 4 s during the software-reboot gate, restarted the same byte-identical managed Climate source, retained empty schedules and recovered AUTO only after fresh BLE input. This is not a physical mains power-cycle claim.

Default order is now:

1. resolve PR #91 with an A/B real-device scanner stop -> watchdog restart -> event-delivery test, closing it if current `main` already recovers correctly;
2. qualify physical mains power-cycle plus remaining Wi-Fi/BLE loss/recovery;
3. run a materially longer soak and close the final real-hardware matrix;
4. declare V1 feature freeze and run release qualification.

Detailed recovery evidence already on `main`: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`, `docs/testing/reboot-recovery-acceptance-2026-10-04.md` and `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`.

Enabling active Standalone Pulse BLE scan is technically unblocked, but remains a separate explicit product/UX slice rather than being smuggled into stabilization work.

Do not add another generic UX-polish round or expand Pulse with unrelated runtime modes unless a concrete defect or accepted product change requires it.

## Verification reminders

- use focused checks while iterating and one final canonical gate on the exact completion head;
- the pre-push hook is only the fast UX/repository policy gate; it is not a substitute for the final canonical gate;
- use responsive/canonical visual acceptance when a slice changes those surfaces;
- use `pnpm release:qualify` for software release evidence;
- use `pnpm release:qualify:hardware` only when real hardware acceptance is actually being claimed.
