# Pulse V1 operational-status acceptance — 2026-10-02

## Scope and accepted candidate

Repository: `MichalMatu/shelly-link`

Accepted operational-status implementation head: `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2` on `pulse-v1-shared-ui`.

This closes the final Pulse V1 dashboard/detail read/presentation slice. It does not change generated Shelly runtime behavior.

## Accepted implementation

One normalized read-only `PulseOperationalStatus` model is shared across Climate, Time + Pulse and standalone Pulse. It includes availability, phase, completed cycles, next-transition uptime, last reason, requested output, final relay output, automation fault, hard-safety state/reason and device uptime.

Climate reuses its existing diagnostic snapshot. Time + Pulse and standalone Pulse use a typed read-only `Script.Eval` adapter over the existing shared-engine state (`R.ps`, `R.pc`, `R.pn`, `R.rs`, requested output and automation fault) and device uptime; the physical relay value comes from Shelly status. Malformed/missing data returns `unavailable`. Active state whose deadline is behind device uptime beyond the 2 s grace becomes `stale`.

The dashboard uses the compact shared summary. Detail uses the full summary and includes automation fault and hard safety. Remaining time is derived from device uptime/deadline values only; React never owns Pulse timing.

No generated scripts, Pulse timers, restart behavior, persistence, safety precedence, install/edit/reconcile semantics or relay ownership changed.

## Automated acceptance

- Focused Pulse operational-status normalization/presentation tests passed during implementation.
- Dedicated responsive E2E `apps/mobile/e2e/pulse-operational-status.spec.ts` passed **5/5** canonical viewports: 360×800, 390×844, 412×915, 768×1024 and 1440×900.
- The dedicated E2E covers compact dashboard status, full detail status, live phase/cycle/remaining-time/reason values, automation-fault/hard-safety detail rows and horizontal-overflow containment.
- Exact completion head `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2` passed full `pnpm check`.
- The complete responsive Playwright suite passed **46/46** on the same head.
- An earlier `check:full` startup failure was traced to an unrelated process already occupying port 5173; isolated-port reruns were green and the final gate used an isolated Vite port.

## Samsung S22+ install/cold-start smoke

The same application code was built and installed on the connected Samsung SM-S906B / Android 16 using preserving-data `adb install -r`.

- APK: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`;
- APK SHA-256: `da7f8204aa2be550f583297646a8072055a04b2c27d83fea70e362fea1c554c5`;
- package: `app.shellylink.mobile`;
- version: `2.0.10` / versionCode `20010`;
- pre-install `firstInstallTime`: `2026-09-28 04:57:23`;
- post-install `firstInstallTime`: unchanged (`2026-09-28 04:57:23`), proving app data was preserved;
- cold start returned `Status: ok` / `LaunchState: COLD`;
- WebView DevTools reported `readyState: complete`, title `Shelly Link`, `scrollWidth == clientWidth == 411`, and the preserved Climate dashboard content was present;
- the preserved installed automation is Climate, not Pulse, so this is an app installation/cold-start/layout smoke and **not** live Pulse operational-status hardware acceptance.

Three diagnostic cold starts completed successfully. An intermittent Capacitor/WebView console warning `Cannot read properties of undefined (reading 'triggerEvent')` appeared with counts 1 / 2 / 0 across the three launches, around app lifecycle/visibility events; it did not prevent the WebView from reaching `readyState: complete` or the dashboard from rendering. It is recorded as an environment/bridge warning rather than evidence of a Pulse status regression. Chromium WebView also emitted platform-level variation/page-load warnings.

## Hardware/runtime qualification decision

No new Shelly relay/runtime hardware mutation was performed for this slice. Existing Climate, Time + Pulse and standalone Pulse runtime/hardware acceptance remains authoritative because the operational-status work is read-only and generated runtime source did not change.

## Result

**PASS — Pulse V1 operational-status implementation and responsive acceptance are closed.** Android preserving-data install/cold-start/layout smoke also passed with the explicit limitation above. Pulse V1 is complete; subsequent work should move to the remaining V1 stabilization/UX plan unless a concrete Pulse regression is found.
