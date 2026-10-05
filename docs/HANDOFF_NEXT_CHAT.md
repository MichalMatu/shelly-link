# Handoff — Stage 9 stabilization in progress

Status: **2026-10-05 — PR #89 healthy-scanner sensor-silence recovery and PR #91 stopped-scanner re-subscription recovery are both merged and hardware-qualified on `main`; PR #90 build/test orchestration is merged. Physical mains power-cycle, remaining Wi-Fi/BLE loss/recovery, long soak and final hardware closeout remain.**

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
- PR #90 — tooling-only build/test orchestration split with canonical `pnpm check` scope preserved;
- PR #91 — hardware-qualified BLE scanner re-subscription after an actually stopped scanner is restarted by the watchdog.

Safe inline Standalone Pulse replacement from PR #83 remains part of the accepted baseline. The earlier PR #81 UX hierarchy closeout remains authoritative for accepted Plug/Thermometer navigation and visual hierarchy; do not reopen that generic UX-polish round without a concrete regression or accepted product change.

PR #90 does not change product/runtime semantics. It splits the existing canonical repository gate into static/tests/build sub-gates, keeps the same `pnpm check` coverage, adds focused `pnpm check:mobile`, shortens pre-push to fast UX/repository policy gates and runs CI static/tests/build/responsive jobs in parallel behind one aggregate `checks` result. Worker concurrency/cache policy remains unchanged.

## Scanner recovery closeout

PR #91 `Fix BLE scanner re-subscription after restart` is merged as `50fc9f083f013a0652d44011da6a6eff534fab9d`. The real-device A/B gate on Plug S Gen3 firmware 1.7.5 proved that unmodified `main` could restart a scanner after `BLE.Scanner.stop()` (`isRunning() == true` and `R.sa` advanced) while target event delivery remained dead (`R.l` did not advance for 75 s).

The PR #91 candidate added a fresh `BLE.Scanner.subscribe(...)` before the watchdog restart. Two consecutive physical stop/restart cycles then restored fresh target frames. The temporary candidate was removed after the gate and the original installed runtime was restored byte-for-byte with final relay OFF. Fresh PR CI #659 passed the canonical repository gate and responsive smoke before merge.

Detailed evidence: `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`.

The accepted scanner contract is now split deliberately:

- sensor silence while `BLE.Scanner.isRunning()` remains true does **not** justify a scanner restart (PR #89);
- an actually stopped scanner must receive a fresh subscription before watchdog restart so event delivery resumes (PR #91).

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

PR #89 scanner-watchdog sensor-silence acceptance and PR #91 stopped-scanner re-subscription acceptance are both complete and merged. PR #89 used target-address isolation while BLE scanning stayed healthy; PR #91 explicitly stopped the scanner and proved that restart without re-subscription restored scanner liveness but not event delivery. Detailed evidence: `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md` and `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`.

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

Do not infer what a physical phone is running from this document. Reuse the canonical Wireless ADB procedure in `docs/PHONE_WIRELESS_ADB.md`. A phone claim is valid only when a fresh deployment task records the exact source SHA, authorized device, preserving-data `adb install -r` result, cold start and live process. Preserve app data by default; use the destructive clean uninstall/install path only when the acceptance explicitly requires fresh-store behavior.

## Next work

The application is near feature-complete. Four Stage 9 runtime/recovery slices are qualified on `main`: soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, deliberate real-device software reboot recovery, and healthy-scanner sensor silence -> stale/OFF -> fresh-BLE AUTO recovery from PR #89. The configured Plug recorded boot-safe OFF at uptime 4 s during the software-reboot gate, restarted the same byte-identical managed Climate source, retained empty schedules and recovered AUTO only after fresh BLE input. This is not a physical mains power-cycle claim.

Default order is now:

1. qualify physical mains power-cycle plus remaining Wi-Fi/BLE loss/recovery on the current merged runtime;
2. run a materially longer soak and close the final real-hardware matrix;
3. declare V1 feature freeze and run release qualification;
4. only after the runtime/backend freeze, begin the explicit new graphical frontend redesign rather than another incremental UX-polish round.

Detailed recovery evidence already on `main`: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`, `docs/testing/reboot-recovery-acceptance-2026-10-04.md`, `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md` and `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`.

Enabling active Standalone Pulse BLE scan is technically unblocked, but remains a separate explicit product/UX slice rather than being smuggled into stabilization work.

Do not add another generic UX-polish round or expand Pulse with unrelated runtime modes unless a concrete defect or accepted product change requires it.

## Verification reminders

- use focused checks while iterating and one final canonical gate on the exact completion head;
- the pre-push hook is only the fast UX/repository policy gate; it is not a substitute for the final canonical gate;
- use responsive/canonical visual acceptance when a slice changes those surfaces;
- use `pnpm release:qualify` for software release evidence;
- use `pnpm release:qualify:hardware` only when real hardware acceptance is actually being claimed.
