# Independent Ionic React audit — 2026-10-10

Scope: `work/ux-evolution` only. The `main` branch was not modified. This report records **verified evidence and unresolved gates**, not a claim that the component migration is complete.

## Current verified product head

- Source/test commit: `81b36f78e4ed3e4bbce171d8c97a1e0b531ece2f`.
- Focused commits: `fc344ec2` (Ionic host interactions), `d240a625` (Plug Detail CTA), `80afbb54` (test host selectors), `a8eb3540` (bounded Vitest concurrency), `c5a778b3` (BLE candidate save), `733d33a8` (Plug dashboard CTA), `81efec8c` (unused CSS), `81b36f78` (BLE-only host assertion). See Git history for complete chronological diff.
- `pnpm check`: PASS at `81b36f78`, including **549/549 mobile unit/integration tests**. Previous parallel-run failures disappeared with explicit 2-worker Vitest and serialized workspace tests; isolated failing suites passed 83/83. The concurrency change affects test execution only.
- Canonical Darwin responsive/visual E2E: **50/50**, zero skipped/unexpected/flaky at `81efec8c`. `81b36f78` changes only one unit test after that visual run. No snapshots refreshed.
- Capacitor sync + Android debug Gradle assemble: PASS. Debug APK 5,179,520 bytes; SHA-256 `db33815dfcc43b909dee24a76a0300f4fbe08e4795f7fc240b0b19891b2ab552`.

## Physical Samsung S22+ / Android 16

- Wireless ADB target `SM-S906B` matched; historical endpoint `192.168.0.100:40973` worked during final install but is session-dependent.
- `adb install -r` returned Success. No uninstall, app data clearing, or reset. `firstInstallTime=2026-09-28 04:57:23` was unchanged before/after.
- Cold launch `LaunchState: COLD`, `MainActivity` foreground, **1005 ms**. Actual 1080 × 2340 screenshot saved under Local Agent runtime path `/tmp/shelly-ionic-81b3-20261010-s22.png` (not committed); snapshot SHA-256 `dee9f5be8be55ae55fa5a175907d69f52bc0cb3ffe74933163ad4d1d74df2350`. UIAutomator dump: 64 nodes, 24 labeled text/content-description entries.
- **Android is not error-free.** Logcat included `E/Capacitor/Console: Uncaught TypeError: Cannot read properties of undefined (reading 'triggerEvent')` (File: blank, Line: 1); no observed `FATAL EXCEPTION` or native process death. This is a nonfatal but unresolved startup/error-log defect, **not** evidence that Ionic/React itself threw it.
- Native-source inspection confirms that `@capacitor/android@7.6.7` invokes `window.Capacitor.triggerEvent(...)` via `Bridge.java:885,889`; its `native-bridge.js:218` registers `triggerEvent`. No `triggerEvent` expression was found in the built app JavaScript. The only direct plugin-side native call found in installed plugin sources was `@capacitor/app@7.1.2 AppPlugin.java:63`: on Android Back, **when a `backButton` listener is present**, it calls `bridge.triggerJSEvent("backbutton", "document")`. Capacitor `Bridge.java:269` installs document-start JS where supported. These observations identify a concrete candidate event path; the captured log did not establish that Back was pressed or that this specific callback caused the error. Disabling Capacitor Back handling would violate existing navigation behavior and is not an approved fix. A native event arriving before Capacitor's JS bridge is initialized is the **leading hypothesis**, not yet a proved root cause or event name. A similar upstream report attributed the identical startup error to beta Android System WebView (Ionic Forum thread 250101). Before patching, reconnect wireless ADB, record `dumpsys webviewupdate`, WebView package/version and channel, reproduce across multiple cold starts, and capture console stack/JS bridge initialization order. The most recent diagnostic reconnect attempt failed; no new handset state was changed.
- Real-device accessibility **labels** were observed through UIAutomator. Systematic TalkBack traversal, virtual keyboard/focus, and overlay interaction on real Android have **not** been fully signed off.

## Native HTML census and boundaries

Fresh scan after current migrations: **75 native controls in app production TSX** = **65 buttons and 10 inputs** (previous counts were 80 then 77, 76). Separately, shared `packages/ui` contains additional intentionally custom native primitives; do not conflate the counts.

- **Frozen Climate form exception:** 10 `input` instances live only in `ClimateRuleAdvancedSettings`, `ClimateRuleDeviceSelectors`, `ClimateRuleEditor`, and the Climate mode of shared `PulseCycleEditor`. Previous Ionic replacement failed canonical `16-climate-setup` visual review (~15k differing pixels), was reverted, and must not return without a visually accurate design.
- **Deliberate custom widgets requiring retained keyboard/ARIA coverage:** bottom/page navigation, tab chrome, icon-only actions, Plug speed dial, relay ON/OFF, AUTO/MANUAL, LED swatches, time wheel, custom option/menu triggers. Native markup here is not automatically an oversight.
- **Still ordinary actions, not exempt and not yet migrated:** some setup-page scan/restart/save/installation actions, Climate recovery/scan actions, Plug and sensor delete/blocked actions, standalone Pulse/Time installation removal actions, confirmation modal actions, and some developer-palette actions. Audit and migrate in small test-backed slices; do not repeat the reverted global `IonicActionButton`/modal batch (17 failures).
- Audit fixes: shared Plug card now guards Ionic hosts against navigation when editing; dev palette ignores Ionic editable controls; focused tests cover both. Only proven orphan CSS `plug-settings-check-row input[type='checkbox']` was removed; LCL tokens are untouched.

## Bundle budget

Production JS: **2,369,824 B** total, biggest file `ion-icon` **1,043,584 B**, CSS 154,245 B, 20 JS chunks; all hard performance budgets pass, but review thresholds (**1,536,098 B** JS, **686,363 B** max chunk, 15 JS chunks) are exceeded. Static HTML/preload graph includes the `ion-icon` chunk: this is an **initial-load** concern, not merely an unused lazy chunk. Investigate tree-shaking/Stencil asset packaging and measured route-level splitting, with before/after bundle and runtime verification. Do not suppress budget warnings or remove Ionic features just to change a score.

## Completion gates

1. Diagnose/reproduce or explicitly accept the Android Capacitor/WebView `triggerEvent` startup error (current blocker).
2. Finish migration of ordinary native actions **or** document each remaining exception; never claim all controls migrated with standard actions remaining.
3. Focus/keyboard/TalkBack/overlay/safety interactions on S22+ with recording and without clearing data.
4. Review and resolve JS-size regression against policy, with measured impact.
5. For **each subsequent source change**, repeat `pnpm check`, full canonical 50/50 E2E with visual diff review, Capacitor sync/build and preserving-data `adb install -r`, cold start and screenshot. Keep `main` unchanged without explicit approval.

## Same-day S22+ follow-up — WebView and Back reproducibility

On 2026-10-10 the S22+ was again available at `192.168.0.100:40973`; ADB confirmed `SM-S906B`, Android 16 and installed `app.shellylink.mobile` version `2.0.10`. No APK reinstall, package changes, data clearing, firmware update or relay action was performed.

- `dumpsys webviewupdate`: **stable `com.google.android.webview` 153.0.8010.57**, versionCode 801005703, target SDK 36. `com.google.android.webview.beta`, dev, canary and debug providers **not installed**. Chrome package version 154.0.8037.127 is separate from the selected WebView provider. Therefore the *beta-WebView* explanation seen elsewhere does **not** fit this handset's current provider.
- Three controlled cold starts (`am force-stop` then `am start -W`) completed in **593 / 533 / 573 ms**, all in the foreground with a process running. Each was followed by 5 seconds of capture: **0 `triggerEvent` errors, 0 `E/Capacitor/Console` errors, 0 native `FATAL EXCEPTION` events**. Fresh actual screenshot: 1080 × 2340; SHA-256 `680dfee26bcbf12ab3092aefdb967f7b821ff2683a21c8a84cd68efc3825bb44`; local path `/tmp/shelly-ionic-triggerEvent-20261010-119-s22.png`.
- Three more cold starts followed by system `Back` (two after 4 seconds and one immediately after activity start) also produced **0 `triggerEvent`, 0 `E/Capacitor/Console`, 0 native fatal**. In each case Back returned to the previously foreground Android Settings screen. The app was then relaunched and left in foreground, PID present, with its `firstInstallTime=2026-09-28 04:57:23` unchanged.
- This **narrows but does not close** the original single Android bridge-console TypeError. It is not currently reproducible under 6 starts and 3 Back presses on the same unchanged APK, and does not establish an Ionic regression. Do not ship a speculative native bridge workaround. If the error recurs, capture WebView/Capacitor initialization timing, `logcat` with timestamps and devtools JS stack before altering production code. Full TalkBack/focus/keyboard testing and remaining ordinary Ionic actions are still open.
